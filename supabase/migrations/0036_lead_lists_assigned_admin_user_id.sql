alter table public.lead_lists
  add column if not exists assigned_admin_user_id uuid references public.admin_users(id);

create index if not exists lead_lists_assigned_admin_user_id_idx on public.lead_lists (assigned_admin_user_id);

notify pgrst, 'reload schema';
