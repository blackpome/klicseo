-- 0042_exclusive_lead_list_items.sql
-- Enforce strict exclusive 1-to-1 lead list membership (1 lead = at most 1 list).

-- 1. Deduplicate any existing duplicate memberships across lists, keeping the latest added_at entry
with ranked_items as (
  select ctid, row_number() over (partition by lead_id order by added_at desc) as rn
  from public.lead_list_items
)
delete from public.lead_list_items
where ctid in (
  select ctid from ranked_items where rn > 1
);

-- 2. Add unique constraint on lead_id so each lead can only be in at most 1 list
alter table public.lead_list_items
  drop constraint if exists lead_list_items_lead_id_key;

alter table public.lead_list_items
  add constraint lead_list_items_lead_id_key unique (lead_id);

notify pgrst, 'reload schema';
