-- Price tiers: each tier is one row of 9 service prices. Cars are assigned to
-- a tier via cars.tier_id. The legacy per-car price columns are kept (the
-- booking wizard and pricing libs still read them) and are mirrored from the
-- tier's prices by the app whenever a tier is edited or a car is reassigned.

create table if not exists public.price_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  monthly int,
  weekly_thrice int,
  outside_monthly int,
  outside_weekly_thrice int,
  one_time_manual int,
  one_time_machine int,
  interior int,
  car_detailing int,
  interior_detailing int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists price_tiers_sort_idx on public.price_tiers (sort_order, name);

alter table public.cars
  add column if not exists tier_id uuid references public.price_tiers(id) on delete set null;

create index if not exists cars_tier_id_idx on public.cars (tier_id);

-- Backfill: collapse distinct 9-price fingerprints in `cars` into tiers, then
-- point each car at its matching tier. Cars with all-null prices are left
-- unassigned.
do $$
declare
  rec record;
  new_tier_id uuid;
  n int := 0;
begin
  for rec in
    select distinct
      monthly, weekly_thrice, outside_monthly, outside_weekly_thrice,
      one_time_manual, one_time_machine, interior, car_detailing, interior_detailing
    from public.cars
    where coalesce(monthly, weekly_thrice, outside_monthly, outside_weekly_thrice,
                   one_time_manual, one_time_machine, interior,
                   car_detailing, interior_detailing) is not null
    order by monthly nulls last
  loop
    n := n + 1;
    insert into public.price_tiers (
      name, sort_order,
      monthly, weekly_thrice, outside_monthly, outside_weekly_thrice,
      one_time_manual, one_time_machine, interior, car_detailing, interior_detailing
    ) values (
      'Tier ' || n, n,
      rec.monthly, rec.weekly_thrice, rec.outside_monthly, rec.outside_weekly_thrice,
      rec.one_time_manual, rec.one_time_machine, rec.interior,
      rec.car_detailing, rec.interior_detailing
    ) returning id into new_tier_id;

    update public.cars set tier_id = new_tier_id
    where coalesce(monthly,-1) is not distinct from coalesce(rec.monthly,-1)
      and coalesce(weekly_thrice,-1) is not distinct from coalesce(rec.weekly_thrice,-1)
      and coalesce(outside_monthly,-1) is not distinct from coalesce(rec.outside_monthly,-1)
      and coalesce(outside_weekly_thrice,-1) is not distinct from coalesce(rec.outside_weekly_thrice,-1)
      and coalesce(one_time_manual,-1) is not distinct from coalesce(rec.one_time_manual,-1)
      and coalesce(one_time_machine,-1) is not distinct from coalesce(rec.one_time_machine,-1)
      and coalesce(interior,-1) is not distinct from coalesce(rec.interior,-1)
      and coalesce(car_detailing,-1) is not distinct from coalesce(rec.car_detailing,-1)
      and coalesce(interior_detailing,-1) is not distinct from coalesce(rec.interior_detailing,-1);
  end loop;
end $$;

alter table public.price_tiers enable row level security;

-- Tier prices are public (the marketing site/booking flow reads them).
drop policy if exists price_tiers_select on public.price_tiers;
create policy price_tiers_select on public.price_tiers for select using (true);
-- Writes go through the service-role key (admin actions).

notify pgrst, 'reload schema';
