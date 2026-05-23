-- Answers to admin-defined custom booking-wizard fields, stored as
-- { "<field label>": "<value>" } so they read cleanly in the admin.

alter table public.leads
  add column if not exists custom_fields jsonb;

notify pgrst, 'reload schema';
