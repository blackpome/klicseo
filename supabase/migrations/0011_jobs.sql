-- Careers job postings. Becomes the single source of truth for both the public
-- careers page AND the employee role dropdown, so the employee job_role check
-- constraint is dropped (job_role now stores a job slug).

create extension if not exists "pgcrypto";

create table if not exists public.jobs (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  slug             text not null unique,
  title            text not null,
  type             text not null default 'PartTime' check (type in ('PartTime','FullTime')),

  blurb            text,          -- short line on the listing card
  description      text,          -- longer body on the job page
  location         text,
  salary           text,          -- free-text range, e.g. "₹15,000–20,000 / mo"
  terms            text,          -- terms & conditions shown on the application

  -- per-field visibility on the public job page
  show_description boolean not null default true,
  show_location    boolean not null default false,
  show_salary      boolean not null default false,
  show_terms       boolean not null default true,

  active           boolean not null default true, -- published on the site
  sort_order       integer not null default 0
);

create index if not exists jobs_active_sort_idx on public.jobs (active, sort_order);

-- Keep updated_at fresh (reuses the function from 0004).
drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;
-- Service-role only, like the other tables.

-- Seed the previously-static roles (slug = old JobRole id so existing employee
-- rows still resolve to a job).
insert into public.jobs (slug, title, type, blurb, sort_order) values
  ('CarWash',       'Car Wash',              'PartTime', 'Daily doorstep washes for subscribed customers — early-morning or evening shift.', 0),
  ('CarDetailing',  'Car Detailing',         'PartTime', 'On-site detailing jobs for premium customers — interior, polish, ceramic prep.',     1),
  ('FieldMarketer', 'Field Marketer',        'FullTime', 'Go door-to-door in target apartment complexes and onboard new subscribers.',         2),
  ('BackOffice',    'Back Office Executive', 'FullTime', 'Handle phone leads, scheduling, customer follow-ups, and daily ops paperwork.',       3)
on conflict (slug) do nothing;

-- job_role is now a free-text job slug, not a fixed enum.
alter table public.employees drop constraint if exists employees_job_role_check;

notify pgrst, 'reload schema';
