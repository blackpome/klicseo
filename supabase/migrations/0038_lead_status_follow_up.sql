-- Allow "follow_up" as a lead status so telecallers can mark leads that require active follow-ups.
--
-- Old constraint allowed: draft, new, contacted, call_not_responded, booked, cancelled.
-- New constraint adds: follow_up.

alter table public.leads drop constraint if exists leads_status_check;

alter table public.leads add constraint leads_status_check
  check (status in ('draft','new','contacted','follow_up','call_not_responded','booked','cancelled'));

notify pgrst, 'reload schema';
