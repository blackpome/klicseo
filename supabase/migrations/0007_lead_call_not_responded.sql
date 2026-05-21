-- Add a 'call_not_responded' lead status (the customer didn't pick up and needs
-- a retry). Widen the status check constraint to allow it.

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('new','contacted','call_not_responded','booked','cancelled'));

notify pgrst, 'reload schema';
