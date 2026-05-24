-- Per-admin "kicked at" timestamp. When set, any session cookie issued before
-- this moment is treated as expired by currentAdmin(), forcing the user to
-- log in again on their next request. Doesn't delete the cookie or revoke
-- the row — it's a soft invalidation.

alter table public.admin_users
  add column if not exists signed_out_after timestamptz;

notify pgrst, 'reload schema';
