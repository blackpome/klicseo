-- Employees / hiring applications. The public careers page inserts rows
-- with status='applied'. Admin moves them through screening → hired → active
-- and eventually fills resignation_date when the person leaves.
--
-- Aadhaar/profile/signature files live in the private 'employee-docs' bucket
-- (created below). We store only the object path in the row.

create extension if not exists "pgcrypto";

create table if not exists public.employees (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),

  status               text not null default 'applied'
                         check (status in ('applied','screening','hired','active','resigned','rejected')),

  job_role             text not null
                         check (job_role in ('CarWash','CarDetailing','FieldMarketer','BackOffice')),

  -- applicant-provided
  name                 text not null,
  phone                text not null,
  location             text,
  aadhaar_number       text,
  aadhaar_photo_path   text,
  profile_photo_path   text,
  signature_path       text,
  terms_accepted_at    timestamptz,

  -- admin-only
  salary               integer,
  reminder_call_date   date,
  joining_date         date,
  resignation_date     date,
  notes                text
);

create index if not exists employees_created_at_idx on public.employees (created_at desc);
create index if not exists employees_status_idx     on public.employees (status);
create index if not exists employees_job_role_idx   on public.employees (job_role);

alter table public.employees enable row level security;
-- No public policies — only the service-role key reads/writes (RLS bypassed
-- for service-role connections by design, mirrors the leads table).

-- Private storage bucket for Aadhaar copy, profile photo, and signature PNG.
-- Service-role uploads/reads; admin UI fetches signed URLs for preview.
insert into storage.buckets (id, name, public)
values ('employee-docs', 'employee-docs', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
