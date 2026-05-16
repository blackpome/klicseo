-- Admin-entered leads paste a Google Maps share URL instead of capturing GPS,
-- and record gate-access instructions as free text rather than a yes/no flag.
alter table public.leads
  add column if not exists map_link          text,
  add column if not exists gate_access_notes text;

notify pgrst, 'reload schema';
