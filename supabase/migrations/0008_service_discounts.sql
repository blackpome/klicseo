-- Real per-line discounts. One row per price line (mirrors the cars price
-- columns / pricing.ts options). discount_percent (0–100) is applied on top of
-- the full list price to get the customer price.

create table if not exists public.service_discounts (
  line             text primary key
                     check (line in (
                       'monthly','weekly_thrice','outside_monthly','outside_weekly_thrice',
                       'one_time_manual','one_time_machine','interior',
                       'car_detailing','interior_detailing'
                     )),
  discount_percent integer not null default 0
                     check (discount_percent >= 0 and discount_percent <= 100),
  updated_at       timestamptz not null default now()
);

-- Seed all 9 lines at 0% (no discount until an admin sets one).
insert into public.service_discounts (line) values
  ('monthly'), ('weekly_thrice'), ('outside_monthly'), ('outside_weekly_thrice'),
  ('one_time_manual'), ('one_time_machine'), ('interior'),
  ('car_detailing'), ('interior_detailing')
on conflict (line) do nothing;

alter table public.service_discounts enable row level security;
-- Service-role only, like the other tables.

-- Record the discount each booking was charged under.
alter table public.leads add column if not exists discount_percent integer;

notify pgrst, 'reload schema';
