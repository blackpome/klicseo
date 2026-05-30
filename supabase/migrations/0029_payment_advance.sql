-- Advance collected alongside a regular monthly payment.
--
-- The admin sometimes collects more cash than the current month's fee (e.g. a
-- customer hands over an extra round number "for next month"). We store that
-- separately so the Collected total reflects it without conflating it with the
-- current month's amount. Behaviour is informational: it does NOT auto-mark
-- future months or accumulate as a credit balance.
--
-- Idempotent + nullable-safe (default 0).

alter table public.payments
  add column if not exists advance_amount integer not null default 0;

comment on column public.payments.advance_amount is
  'Extra rupees collected alongside this month''s payment. 0 by default.';

notify pgrst, 'reload schema';
