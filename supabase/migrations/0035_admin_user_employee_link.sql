alter table public.admin_users
  add column if not exists employee_id uuid references public.employees(id);

create index if not exists admin_users_employee_id_idx on public.admin_users (employee_id);

notify pgrst, 'reload schema';
