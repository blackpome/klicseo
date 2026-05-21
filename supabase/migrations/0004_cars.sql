-- Car catalog + per-car pricing.
--
-- The booking wizard looks a car up by brand + model and reads the price for
-- the chosen service straight from this table. If a car isn't found (or the
-- relevant price cell is blank), the wizard falls back to "our team will call
-- you back" and saves the lead with a null price_total.
--
-- One flat table on purpose: the columns mirror "Car Pricing by Segment.csv"
-- 1:1, so the sheet can be imported directly via Supabase → Table editor →
-- Import data from CSV (map each CSV header to the matching column below).
-- Prices are nullable — a blank cell in the sheet means "price on request".

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm"; -- fuzzy brand/model search

create table if not exists public.cars (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- identity (CSV: Brand, Model)
  brand              text not null,
  model              text not null,

  -- segment / catalog metadata (CSV: Segment Code, Segment Name, Body Type,
  -- Fuel Type, Launch Year, Discontinued Year, Status, Approx Length (mm))
  segment_code       text,
  segment_name       text,
  body_type          text,
  fuel_type          text,
  launch_year        integer,
  discontinued_year  text,   -- free text: a year or "Current"
  status             text,
  approx_length_mm   integer,

  -- pricing in INR (CSV price columns). Nullable = price on request.
  monthly                       integer, -- CSV: Monthly
  weekly_thrice                 integer, -- CSV: Weekly Thrice
  outside_monthly               integer, -- CSV: Outside Monthly Car Wash
  outside_weekly_thrice         integer, -- CSV: Outside Weekly Thrice
  one_time_manual               integer, -- CSV: One Time Manual
  one_time_machine              integer, -- CSV: One Time Machine
  interior                      integer, -- CSV: Interior (one-time add-on)
  car_detailing                 integer, -- CSV: Car Detailing (ceramic sealant)
  interior_detailing            integer  -- CSV: Interior Detailing
);

-- One row per car. Case-insensitive so "Tata" / "tata" can't double up.
create unique index if not exists cars_brand_model_key
  on public.cars (lower(brand), lower(model));

-- Trigram indexes power the wizard's type-ahead search and scale to
-- thousands of rows without a full scan.
create index if not exists cars_brand_trgm on public.cars using gin (brand gin_trgm_ops);
create index if not exists cars_model_trgm on public.cars using gin (model gin_trgm_ops);

alter table public.cars enable row level security;
-- No public policies: only the service-role key reads this table (via the
-- server-side /api/cars/search route), matching the leads/employees pattern.

-- Keep updated_at fresh on edits.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cars_set_updated_at on public.cars;
create trigger cars_set_updated_at
  before update on public.cars
  for each row execute function public.set_updated_at();

-- Record the chosen brand on the lead (model already lives in car_model).
alter table public.leads add column if not exists car_brand text;
