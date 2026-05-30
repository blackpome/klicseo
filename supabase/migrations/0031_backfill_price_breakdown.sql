-- Backfill price_base / price_interior_addon for leads created before 0030.
--
-- Case 1 (exact): no interior add-on → the total IS the base price.
--
-- Case 2 (approximate): interior add-on selected → reconstruct the split by
-- matching the lead's car_brand+model to a car in the catalog, then reading
-- the current tier amount for the category's is_addon option's base price
-- line. Uses current prices, so any lines where the tier price changed since
-- the booking will be off; those rows are left for manual correction.

-- Case 1 — exact, no estimation needed.
update public.leads
set price_base = price_total
where interior_add_on = false
  and price_total is not null
  and price_base is null;

-- Case 2 — best-effort split from current tier prices.
-- DISTINCT ON (l2.id) picks one car deterministically when brand+model is
-- ambiguous (e.g. multiple trims mapped to different tiers).
update public.leads l
set
  price_interior_addon = match.amount,
  price_base           = l.price_total - match.amount
from (
  select distinct on (l2.id)
    l2.id,
    pta.amount
  from public.leads l2
  join public.cars c
    on c.brand = l2.car_brand
   and c.model = l2.car_model
   and c.tier_id is not null
  join public.price_tier_amounts pta on pta.tier_id = c.tier_id
  join public.service_price_lines spl
    on spl.id = pta.line_id
   and spl.kind = 'base'
  join public.service_options so
    on so.id = spl.option_id
   and so.is_addon = true
  join public.service_categories sc
    on sc.id = so.category_id
   and sc.legacy_key = l2.service
  where l2.interior_add_on = true
    and l2.price_total is not null
    and l2.price_base is null
    and pta.amount > 0
    and pta.amount < l2.price_total
  order by l2.id, c.id
) match
where l.id = match.id;
