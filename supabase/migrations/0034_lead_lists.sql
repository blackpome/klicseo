-- Lead lists for grouping leads and assigning to staff
create table if not exists public.lead_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.admin_users(id), -- tracks which admin created the list
  assigned_employee_id uuid references public.employees(id) -- staff member responsible for this list
);

-- Junction table for many-to-many relationship between lists and leads
create table if not exists public.lead_list_items (
  list_id uuid references public.lead_lists(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, lead_id)
);

-- Indexes for performance
create index if not exists lead_lists_created_by_idx on public.lead_lists (created_by);
create index if not exists lead_lists_assigned_employee_id_idx on public.lead_lists (assigned_employee_id);
create index if not exists lead_list_items_list_id_idx on public.lead_list_items (list_id);
create index if not exists lead_list_items_lead_id_idx on public.lead_list_items (lead_id);

notify pgrst, 'reload schema';