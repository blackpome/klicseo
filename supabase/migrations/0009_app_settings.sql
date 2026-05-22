-- Small key/value store for site-wide toggles. First use: whether the discount
-- "% OFF" badge is shown on the website.

create table if not exists public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Default the offer badge ON (matches prior behaviour where it always showed).
insert into public.app_settings (key, value)
values ('offer_badge_enabled', 'true')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;
-- Service-role only, like the other tables.

notify pgrst, 'reload schema';
