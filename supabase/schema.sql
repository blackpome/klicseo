-- Klicseo leads table.
-- Run this once in Supabase SQL editor (Project -> SQL -> New query).
-- The server uses the service-role key to read/write, so RLS isn't required
-- for correctness — but it's enabled below as defense-in-depth in case the
-- anon key is ever accidentally used for these rows.

create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  source              text not null default 'wizard'
                       check (source in ('wizard','admin')),
  status              text not null default 'new'
                       check (status in ('new','contacted','booked','cancelled')),

  -- contact
  name                text,
  phone               text,

  -- service
  service             text,
  service_option      text,
  interior_add_on     boolean not null default false,

  -- vehicle
  vehicle_type        text,
  car_model           text,
  car_number          text,

  -- location
  pincode             text,
  address             text,
  parking_location    text,
  car_cover_choice    text,
  gate_access_consent boolean not null default false,
  shift               text,

  -- callback
  callback_date       text,
  callback_time       text,

  -- GPS captured from the wizard's geolocation check
  latitude            double precision,
  longitude           double precision,

  -- pricing snapshot at submission time
  price_total         integer,

  -- admin-only
  notes               text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status);

alter table public.leads enable row level security;

-- No public policies — only the service-role key can read/write (RLS bypassed
-- for service-role connections by design).
