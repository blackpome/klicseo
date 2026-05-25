-- Allow "draft" as a lead status so the booking wizard can save partial
-- submissions before the user finishes the form (see /api/booking/draft).
-- "draft" rows show on /admin behind the dedicated Draft tab and are excluded
-- from the default "All" view so they don't drown out actionable leads.
--
-- Old constraint allowed: new, contacted, call_not_responded, booked, cancelled.
-- New constraint adds: draft.

alter table public.leads drop constraint if exists leads_status_check;

alter table public.leads add constraint leads_status_check
  check (status in ('draft','new','contacted','call_not_responded','booked','cancelled'));

notify pgrst, 'reload schema';
