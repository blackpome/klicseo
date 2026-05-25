-- price_tier_amounts gains an optional MRP override per (tier, line).
--
-- Background: the stored `amount` is now the *net* price the customer is
-- charged. When a line has a discount %, the UI shows a struck-through
-- "original" price computed by inflating `amount` (see grossUp() in pricing.ts).
-- When `mrp_amount` is set, it overrides the computed gross-up — useful for
-- psychological prices like ₹1499 instead of the auto-rounded ₹1500.
--
-- Idempotent + nullable, so existing rows continue to work unchanged.

alter table public.price_tier_amounts
  add column if not exists mrp_amount integer;

comment on column public.price_tier_amounts.mrp_amount is
  'Optional displayed MRP override. NULL → compute on the fly from amount + discount%. When set, must be > amount.';

notify pgrst, 'reload schema';
