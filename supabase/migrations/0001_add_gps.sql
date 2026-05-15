-- Add GPS coordinates captured at booking time so the admin can open the
-- customer's pin on a map (the existing address is free-text).
alter table public.leads
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;

notify pgrst, 'reload schema';
