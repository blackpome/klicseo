-- Stores the price breakdown on a lead so the admin can see base service
-- price and interior add-on price separately, not just the combined total.
-- Populated at booking submit time (and kept in sync on draft saves).
-- Null for leads created before this migration.

alter table public.leads
  add column if not exists price_base          integer,
  add column if not exists price_interior_addon integer;
