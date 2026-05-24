-- Phase 7a: tier prices live exclusively in price_tier_amounts now. The 9
-- legacy columns on price_tiers were a mirror during the transition; drop
-- them and make price_tier_amounts the single source of truth.

alter table public.price_tiers
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
