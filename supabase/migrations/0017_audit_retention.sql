-- Audit log retention: keep 6 months. The app prunes opportunistically (on log
-- views + occasionally on writes). For a guaranteed schedule, enable pg_cron in
-- Supabase (Database → Extensions) and uncomment the cron.schedule line below.

create or replace function public.prune_audit_logs()
returns void language sql as $$
  delete from public.audit_logs where created_at < now() - interval '6 months';
$$;

-- Optional scheduled run (requires the pg_cron extension):
--   select cron.schedule('prune-audit-logs', '0 3 1 * *', $$select public.prune_audit_logs()$$);

notify pgrst, 'reload schema';
