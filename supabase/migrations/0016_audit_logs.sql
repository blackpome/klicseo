-- Admin audit trail. One row per admin action, for investigations.

create extension if not exists "pgcrypto";

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  actor_email text,           -- who did it (null = system/unknown)
  actor_role  text,
  action      text not null,  -- e.g. 'lead.delete', 'payment.save', 'login'
  entity      text,           -- 'lead' | 'employee' | 'car' | ...
  entity_id   text,           -- affected row id (if any)
  summary     text,           -- human-readable description
  metadata    jsonb           -- extra structured detail
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx  on public.audit_logs (action);
create index if not exists audit_logs_actor_idx   on public.audit_logs (actor_email);
create index if not exists audit_logs_entity_idx  on public.audit_logs (entity);

alter table public.audit_logs enable row level security;
-- Service-role only, like the other tables.

notify pgrst, 'reload schema';
