-- Phase 1 of the dynamic-services refactor: schema foundation + backfill.
--
-- Today the app has 3 hardcoded service categories (CarWash, OneTimeCarWash,
-- CarDetailing), 6 hardcoded service options under them, and 9 hardcoded price
-- columns on `cars`/`price_tiers`. This migration introduces tables that
-- describe those things as data — once everything is reading from these
-- tables, admins can rename, toggle, and (later) add new categories/options.
--
-- The legacy columns are kept untouched here; only added-data, no removals.
-- Subsequent phases will: (Phase 2) read dynamically, (Phase 3) admin CRUD,
-- (Phase 7) drop the legacy columns. Backfill is idempotent: re-running the
-- migration won't produce duplicates.

create extension if not exists "pgcrypto";

-- 1) Categories (the top-level pickers in step 1) ---------------------------
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  blurb text,
  icon_key text,
  sort_order int not null default 0,
  enabled boolean not null default true,
  legacy_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Service options (sub-categories under a category) ----------------------
create table if not exists public.service_options (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete cascade,
  slug text unique not null,
  label text not null,
  short_label text,
  blurb text,
  recurring text not null default 'one_time' check (recurring in ('monthly','one_time')),
  has_outside_variant boolean not null default false,
  has_addon boolean not null default false,
  sort_order int not null default 0,
  enabled boolean not null default true,
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_options_category_idx on public.service_options (category_id, sort_order);

-- 3) Price lines (one per chargeable column on cars/price_tiers) -----------
-- kind=base/outside → belongs to a specific option
-- kind=addon        → belongs to the category, shared across its options
create table if not exists public.service_price_lines (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete cascade,
  option_id uuid references public.service_options(id) on delete cascade,
  kind text not null check (kind in ('base','outside','addon')),
  label text not null,
  legacy_line text unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- base / outside must reference an option; addon must not
  constraint price_lines_kind_option_check check (
    (kind in ('base','outside') and option_id is not null)
    or (kind = 'addon' and option_id is null)
  )
);

create index if not exists price_lines_category_idx on public.service_price_lines (category_id, sort_order);
create index if not exists price_lines_option_idx   on public.service_price_lines (option_id);

-- 4) Per-tier amounts (eventually replaces 9 fixed columns on price_tiers)
create table if not exists public.price_tier_amounts (
  tier_id uuid not null references public.price_tiers(id) on delete cascade,
  line_id uuid not null references public.service_price_lines(id) on delete cascade,
  amount int,
  primary key (tier_id, line_id)
);

-- 5) Per-car amounts (eventually replaces 9 fixed columns on cars)
create table if not exists public.car_price_amounts (
  car_id uuid not null references public.cars(id) on delete cascade,
  line_id uuid not null references public.service_price_lines(id) on delete cascade,
  amount int,
  primary key (car_id, line_id)
);

-- RLS: marketing site / booking flow needs to read these; writes go through
-- the service-role key (admin actions only).
alter table public.service_categories    enable row level security;
alter table public.service_options       enable row level security;
alter table public.service_price_lines   enable row level security;
alter table public.price_tier_amounts    enable row level security;
alter table public.car_price_amounts     enable row level security;

drop policy if exists categories_select   on public.service_categories;
drop policy if exists options_select      on public.service_options;
drop policy if exists price_lines_select  on public.service_price_lines;
drop policy if exists tier_amounts_select on public.price_tier_amounts;
drop policy if exists car_amounts_select  on public.car_price_amounts;

create policy categories_select   on public.service_categories    for select using (true);
create policy options_select      on public.service_options       for select using (true);
create policy price_lines_select  on public.service_price_lines   for select using (true);
create policy tier_amounts_select on public.price_tier_amounts    for select using (true);
create policy car_amounts_select  on public.car_price_amounts     for select using (true);

-- ============================================================================
-- BACKFILL: seed the new tables from the current hardcoded values.
-- Idempotent via the legacy_key / legacy_id / legacy_line unique constraints
-- and ON CONFLICT no-op.
-- ============================================================================

-- 3 categories
insert into public.service_categories (slug, label, blurb, sort_order, enabled, legacy_key) values
  ('car-wash',         'Subscription Car Wash', 'Daily monthly washes at your doorstep.', 1, true, 'CarWash'),
  ('one-time-car-wash','One-Time Car Wash',     'A single, thorough exterior + optional interior wash.', 2, true, 'OneTimeCarWash'),
  ('car-detailing',    'Car Detailing',         'Full detailing — ceramic sealant and interior deep clean.', 3, true, 'CarDetailing')
on conflict (legacy_key) do nothing;

-- 6 service options under their categories
with cats as (
  select id, legacy_key from public.service_categories
)
insert into public.service_options
  (category_id, slug, label, short_label, recurring, has_outside_variant, has_addon, sort_order, enabled, legacy_id)
select c.id, opt.slug, opt.label, opt.short_label, opt.recurring,
       opt.has_outside_variant, opt.has_addon, opt.sort_order, true, opt.legacy_id
from (values
  ('CarWash',        'monthly-car-wash',  'Monthly Car Wash',    'Monthly',          'monthly',  true,  false, 1, 'Monthly'),
  ('CarWash',        'weekly-thrice',     'Weekly Thrice',       'Weekly Thrice',    'monthly',  true,  false, 2, 'WeeklyThrice'),
  ('OneTimeCarWash', 'one-time-manual',   'One-Time Manual',     'Manual',           'one_time', false, true,  1, 'OneTimeManual'),
  ('OneTimeCarWash', 'one-time-machine',  'One-Time Machine',    'Machine',          'one_time', false, true,  2, 'OneTimeMachine'),
  ('CarDetailing',   'ceramic-sealant',   'Ceramic Sealant',     'Ceramic Sealant',  'one_time', false, true,  1, 'CeramicSealant'),
  ('CarDetailing',   'interior-detailing','Interior Detailing',  'Interior Detail',  'one_time', false, false, 2, 'InteriorDetailing')
) as opt(legacy_key, slug, label, short_label, recurring, has_outside_variant, has_addon, sort_order, legacy_id)
join cats c on c.legacy_key = opt.legacy_key
on conflict (legacy_id) do nothing;

-- 9 price lines mapped to legacy column names
with cats as (
  select id, legacy_key from public.service_categories
),
opts as (
  select id, legacy_id from public.service_options
)
insert into public.service_price_lines
  (category_id, option_id, kind, label, legacy_line, sort_order)
select cats.id,
       case when L.option_legacy is not null then opts.id else null end,
       L.kind, L.label, L.legacy_line, L.sort_order
from (values
  -- CarWash
  ('CarWash',        'Monthly',           'base',    'Monthly Car Wash',         'monthly',                1),
  ('CarWash',        'Monthly',           'outside', 'Outside Monthly Car Wash', 'outside_monthly',        2),
  ('CarWash',        'WeeklyThrice',      'base',    'Weekly Thrice',            'weekly_thrice',          3),
  ('CarWash',        'WeeklyThrice',      'outside', 'Outside Weekly Thrice',    'outside_weekly_thrice',  4),
  -- OneTimeCarWash
  ('OneTimeCarWash', 'OneTimeManual',     'base',    'One Time Manual',          'one_time_manual',        1),
  ('OneTimeCarWash', 'OneTimeMachine',    'base',    'One Time Machine',         'one_time_machine',       2),
  ('OneTimeCarWash', null,                'addon',   'Interior (add-on)',        'interior',               3),
  -- CarDetailing
  ('CarDetailing',   'CeramicSealant',    'base',    'Car Detailing',            'car_detailing',          1),
  ('CarDetailing',   null,                'addon',   'Interior Detailing',       'interior_detailing',     2)
) as L(category_legacy, option_legacy, kind, label, legacy_line, sort_order)
join cats on cats.legacy_key = L.category_legacy
left join opts on opts.legacy_id = L.option_legacy
on conflict (legacy_line) do nothing;

-- Backfill per-tier amounts from the legacy columns on price_tiers.
-- One row per (tier, price_line) where the legacy column is non-null.
insert into public.price_tier_amounts (tier_id, line_id, amount)
select t.id, l.id,
       case l.legacy_line
         when 'monthly'                then t.monthly
         when 'weekly_thrice'          then t.weekly_thrice
         when 'outside_monthly'        then t.outside_monthly
         when 'outside_weekly_thrice'  then t.outside_weekly_thrice
         when 'one_time_manual'        then t.one_time_manual
         when 'one_time_machine'       then t.one_time_machine
         when 'interior'               then t.interior
         when 'car_detailing'          then t.car_detailing
         when 'interior_detailing'     then t.interior_detailing
       end as amount
from public.price_tiers t
cross join public.service_price_lines l
where l.legacy_line is not null
on conflict (tier_id, line_id) do nothing;

-- Same for cars.
insert into public.car_price_amounts (car_id, line_id, amount)
select c.id, l.id,
       case l.legacy_line
         when 'monthly'                then c.monthly
         when 'weekly_thrice'          then c.weekly_thrice
         when 'outside_monthly'        then c.outside_monthly
         when 'outside_weekly_thrice'  then c.outside_weekly_thrice
         when 'one_time_manual'        then c.one_time_manual
         when 'one_time_machine'       then c.one_time_machine
         when 'interior'               then c.interior
         when 'car_detailing'          then c.car_detailing
         when 'interior_detailing'     then c.interior_detailing
       end as amount
from public.cars c
cross join public.service_price_lines l
where l.legacy_line is not null
on conflict (car_id, line_id) do nothing;

notify pgrst, 'reload schema';
