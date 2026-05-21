-- Admin-panel access control.
--
-- Credentials (email + password) and password-reset / invite emails are owned
-- by Supabase Auth (auth.users). This table is the *allowlist* layer on top:
-- it decides who is allowed into /admin at all, what role they hold, and — for
-- staff — exactly which capabilities they were granted.
--
-- Login flow: verify email+password against Supabase Auth, THEN require an
-- active row here. Revoking = flipping status to 'revoked' (next request is
-- rejected). The super_admin is also pinned by the SUPER_ADMIN_EMAIL env var,
-- so the owner can never be locked out even if this row is missing/edited.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table if not exists public.admin_users (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- Matches auth.users.email (case-insensitive). Not a FK: the allowlist row
  -- may be created (invited) a moment before the auth user row settles.
  email        citext not null unique,

  role         text not null default 'staff'
                 check (role in ('super_admin','admin','staff')),

  status       text not null default 'active'
                 check (status in ('active','revoked')),

  -- Granular capabilities. Only consulted for role='staff'; admins and
  -- super_admins implicitly hold every permission. Allowed values mirror
  -- ALL_PERMISSIONS in src/lib/admin-users.ts:
  --   'leads.view','leads.manage','employees.view','employees.manage'
  permissions  text[] not null default '{}',

  -- Email of the admin/super_admin who created this row (audit trail).
  invited_by   citext
);

create index if not exists admin_users_status_idx on public.admin_users (status);

alter table public.admin_users enable row level security;
-- No public policies — only the service-role key reads/writes (RLS bypassed
-- for service-role connections by design, mirrors leads/employees).

notify pgrst, 'reload schema';
