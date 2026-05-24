-- Make service_discounts indexable by service_price_lines.id so we can store
-- discounts for catalog lines that have no legacy_line (admin-created via the
-- Services editor). A trigger keeps a discount row in lock-step with every
-- price line so the editor never has to insert on first save.

alter table public.service_discounts
  add column if not exists line_id uuid references public.service_price_lines(id) on delete cascade;

-- The original table restricted `line` to the 9 hardcoded legacy strings via
-- a CHECK constraint, and likely required it to be NOT NULL / PK. We're
-- switching the source of truth to `line_id`, so neither holds anymore.
alter table public.service_discounts drop constraint if exists service_discounts_line_check;
alter table public.service_discounts drop constraint if exists service_discounts_pkey;
alter table public.service_discounts alter column line drop not null;

-- Re-key on line_id. Idempotent: add the unique constraint only if it doesn't
-- already exist (a partial-run from the previous migration may have created it).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'service_discounts_line_id_unique'
      and conrelid = 'public.service_discounts'::regclass
  ) then
    alter table public.service_discounts
      add constraint service_discounts_line_id_unique unique (line_id);
  end if;
end $$;

create index if not exists service_discounts_line_id_idx on public.service_discounts (line_id);

-- Backfill line_id from existing legacy line strings (idempotent).
update public.service_discounts sd
set line_id = spl.id
from public.service_price_lines spl
where sd.line = spl.legacy_line
  and sd.line_id is null;

-- Seed a default discount row for every catalog line that doesn't have one.
-- For non-legacy lines we leave `line` NULL — line_id is now the key.
insert into public.service_discounts (line, line_id, discount_percent, badge_enabled, updated_at)
select spl.legacy_line, spl.id, 0, true, now()
from public.service_price_lines spl
where not exists (select 1 from public.service_discounts sd where sd.line_id = spl.id);

-- Trigger: auto-create a default discount row when a new price line is added.
create or replace function public.ensure_discount_for_line()
returns trigger language plpgsql as $$
begin
  insert into public.service_discounts (line, line_id, discount_percent, badge_enabled, updated_at)
  values (new.legacy_line, new.id, 0, true, now())
  on conflict (line_id) do nothing;
  return new;
end;
$$;

drop trigger if exists service_price_lines_default_discount on public.service_price_lines;
create trigger service_price_lines_default_discount
  after insert on public.service_price_lines
  for each row execute function public.ensure_discount_for_line();

notify pgrst, 'reload schema';
