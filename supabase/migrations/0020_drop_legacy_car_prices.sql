-- Tier-only pricing for cars: prices live on price_tiers, cars carry only a
-- tier_id pointer. Per-car overrides are not supported (admin decision).
--
-- This drops:
--   * car_price_amounts (no per-car amounts anymore)
--   * the 9 legacy price columns on cars (mirrored from tier, now redundant)
--
-- price_tiers + price_tier_amounts are unaffected — prices still live there.
-- The search_cars() RPC returns `setof public.cars` so it follows the new
-- column set automatically; no re-create needed.

drop table if exists public.car_price_amounts;

alter table public.cars
  drop column if exists monthly,
  drop column if exists weekly_thrice,
  drop column if exists outside_monthly,
  drop column if exists outside_weekly_thrice,
  drop column if exists one_time_manual,
  drop column if exists one_time_machine,
  drop column if exists interior,
  drop column if exists car_detailing,
  drop column if exists interior_detailing;

notify pgrst, 'reload schema';
