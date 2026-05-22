-- Per-job application form config: which optional fields are shown and which
-- are required. Stored as JSON; empty {} means "use defaults" (see
-- APP_FIELD_DEFAULTS in jobs-shared.ts). Name & phone are always collected.

alter table public.jobs
  add column if not exists application_fields jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
