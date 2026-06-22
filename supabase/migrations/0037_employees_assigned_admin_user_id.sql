alter table public.employees
  add column if not exists assigned_admin_user_id uuid references public.admin_users(id);

create index if not exists employees_assigned_admin_user_id_idx on public.employees (assigned_admin_user_id);
