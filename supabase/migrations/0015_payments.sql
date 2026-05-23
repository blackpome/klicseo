-- Monthly payment tracking for booked customers. One row per customer (lead)
-- per month (period = 'YYYY-MM').

create extension if not exists "pgcrypto";

create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  lead_id     uuid not null references public.leads(id) on delete cascade,
  period      text not null,                       -- 'YYYY-MM'
  amount      integer,
  status      text not null default 'pending'
                check (status in ('paid','pending')),
  method      text,                                -- cash / upi / card / other
  paid_at     date,
  notes       text,

  unique (lead_id, period)
);

create index if not exists payments_period_idx on public.payments (period);
create index if not exists payments_lead_idx   on public.payments (lead_id);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;
-- Service-role only, like the other tables.

notify pgrst, 'reload schema';
