-- Interior add-on as a first-class, admin-managed option.
--
-- Goal: each service category offers an interior add-on that (a) shows in the
-- booking wizard only as a toggle under a selected base service (never its own
-- card), (b) can be turned on/off by the admin in Booking -> Step 1, and (c) has
-- its own per-tier price box in the Cars tab.
--
-- Model: an interior add-on is a `service_options` row flagged `is_addon=true`
-- with a single `base` price line (its per-tier price). This reuses the option
-- enable/disable + rename UI and the tier price grid for free.
--
-- This migration also folds the old category-level `addon` price lines
-- (`interior`, `interior_detailing`) into the new add-on options' base lines so
-- existing prices carry over, then drops the old lines.
--
-- Idempotent: keys off legacy identifiers and "not exists" guards. The live DB
-- has diverged from seed (admin-created rows), so nothing assumes seed state.

-- 0) Schema -----------------------------------------------------------------
alter table public.service_options
  add column if not exists is_addon boolean not null default false;

-- Base options that offer interior keep has_addon=true (drives the toggle).
update public.service_options
  set has_addon = true
  where legacy_id in ('Monthly','WeeklyThrice','OneTimeManual','OneTimeMachine','CeramicSealant');

-- 1) Car Detailing: convert the decorative InteriorDetailing option ----------
update public.service_options
  set is_addon = true, has_addon = false, has_outside_variant = false
  where legacy_id = 'InteriorDetailing';

-- 2) One-Time + Subscription: create an interior add-on option if missing -----
insert into public.service_options
  (category_id, slug, label, short_label, recurring, has_outside_variant, has_addon, is_addon, sort_order, enabled)
select c.id, v.slug, 'Interior cleaning', 'Interior', 'one_time', false, false, true,
       coalesce((select max(o2.sort_order) from public.service_options o2 where o2.category_id = c.id), 0) + 1,
       true
from public.service_categories c
join (values
  ('OneTimeCarWash', 'interior-cleaning-onetime'),
  ('CarWash',        'interior-cleaning-subscription')
) as v(legacy_key, slug) on v.legacy_key = c.legacy_key
where not exists (
  select 1 from public.service_options o where o.category_id = c.id and o.is_addon
);

-- 3) Ensure every is_addon option has its single base price line -------------
insert into public.service_price_lines (category_id, option_id, kind, label, sort_order)
select o.category_id, o.id, 'base', o.label, 1
from public.service_options o
where o.is_addon
  and not exists (
    select 1 from public.service_price_lines l where l.option_id = o.id and l.kind = 'base'
  );

-- 4) Carry over prices from the old category-level addon lines ---------------
--    interior            -> One-Time interior add-on base line
--    interior_detailing  -> Car Detailing interior add-on base line
-- Tier amounts (with MRP override):
insert into public.price_tier_amounts (tier_id, line_id, amount, mrp_amount)
select pta.tier_id, base.id, pta.amount, pta.mrp_amount
from public.service_price_lines old
join public.price_tier_amounts pta on pta.line_id = old.id
join public.service_options o
  on o.is_addon
  and o.category_id = old.category_id
join public.service_price_lines base
  on base.option_id = o.id and base.kind = 'base'
where old.kind = 'addon' and old.legacy_line in ('interior','interior_detailing')
on conflict (tier_id, line_id) do nothing;

-- (Pricing is tier-only in this project — there is no car_price_amounts table.)

-- 5) Drop the old category-level addon lines (cascades their amounts) --------
delete from public.service_price_lines
  where kind = 'addon' and legacy_line in ('interior','interior_detailing');

notify pgrst, 'reload schema';
