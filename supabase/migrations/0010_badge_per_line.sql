-- Per-line discount badge toggle. Each service line can show or hide its
-- "% OFF" badge independently (the discount itself still applies to prices).

alter table public.service_discounts
  add column if not exists badge_enabled boolean not null default true;

notify pgrst, 'reload schema';
