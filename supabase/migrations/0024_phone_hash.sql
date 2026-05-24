-- Phone numbers are now stored encrypted (see src/lib/crypto.ts). To preserve
-- exact-match search on a phone number, we keep a HMAC-SHA256 hash of the
-- normalized phone in a sibling column. The hash is keyed with the app's
-- encryption key (server-only), so a leaked DB dump alone can't be brute-
-- forced offline.

alter table public.leads
  add column if not exists phone_hash text;

create index if not exists leads_phone_hash_idx on public.leads (phone_hash);

alter table public.employees
  add column if not exists phone_hash text;

create index if not exists employees_phone_hash_idx on public.employees (phone_hash);

notify pgrst, 'reload schema';
