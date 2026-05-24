-- Lead area (locality) — plaintext, indexable. Lives next to the encrypted
-- `address` column so admins can filter leads by neighbourhood without the
-- full street/flat details ever leaving ciphertext.
--
-- Auto-derived from `pincode` via the pincode_areas lookup when a lead is
-- created/updated without an explicit area. Admins can still type or edit
-- it freely (autocomplete-style).

alter table public.leads
  add column if not exists area text;

create index if not exists leads_area_idx on public.leads (area);

-- pincode → area lookup. Stable, small reference table.
create table if not exists public.pincode_areas (
  pincode text primary key check (pincode ~ '^[0-9]{6}$'),
  area text not null,
  created_at timestamptz not null default now()
);

-- Public read so the booking wizard could (later) call this directly; writes
-- via service role only.
alter table public.pincode_areas enable row level security;
drop policy if exists pincode_areas_select on public.pincode_areas;
create policy pincode_areas_select on public.pincode_areas for select using (true);

-- Common Chennai pincodes → locality names. Seeded list — admins can add more
-- via direct DB insert. Unknown pincodes simply skip auto-derive; admin can
-- still type the area manually.
insert into public.pincode_areas (pincode, area) values
  ('600001', 'George Town'),
  ('600002', 'Anna Salai'),
  ('600003', 'Park Town'),
  ('600004', 'Mylapore'),
  ('600005', 'Triplicane'),
  ('600006', 'Thousand Lights'),
  ('600008', 'Egmore'),
  ('600010', 'Kilpauk'),
  ('600011', 'Perambur'),
  ('600014', 'Royapettah'),
  ('600015', 'Saidapet'),
  ('600017', 'T. Nagar'),
  ('600018', 'Teynampet'),
  ('600020', 'Adyar'),
  ('600024', 'Kodambakkam'),
  ('600028', 'R. A. Puram'),
  ('600030', 'Shenoy Nagar'),
  ('600031', 'Chetpet'),
  ('600032', 'Guindy'),
  ('600033', 'West Mambalam'),
  ('600034', 'Nungambakkam'),
  ('600035', 'Nandanam'),
  ('600040', 'Anna Nagar West'),
  ('600041', 'Thiruvanmiyur'),
  ('600042', 'Velachery'),
  ('600043', 'St. Thomas Mount'),
  ('600044', 'Chromepet'),
  ('600045', 'Selaiyur'),
  ('600049', 'Madhavaram'),
  ('600053', 'Ambattur OT'),
  ('600058', 'Ambattur Industrial Estate'),
  ('600059', 'Pallavaram'),
  ('600061', 'Nanganallur'),
  ('600063', 'Tambaram East'),
  ('600064', 'Tambaram West'),
  ('600066', 'Ambattur'),
  ('600073', 'Selaiyur'),
  ('600078', 'Kodambakkam West'),
  ('600082', 'Aminjikarai'),
  ('600083', 'K. K. Nagar'),
  ('600085', 'Kotturpuram'),
  ('600086', 'Gopalapuram'),
  ('600087', 'Vadapalani'),
  ('600088', 'Adambakkam'),
  ('600089', 'Saligramam'),
  ('600090', 'Besant Nagar'),
  ('600091', 'Madipakkam'),
  ('600092', 'Virugambakkam'),
  ('600093', 'Saligramam'),
  ('600094', 'Choolaimedu'),
  ('600095', 'Manapakkam'),
  ('600096', 'Sholinganallur'),
  ('600097', 'Karapakkam'),
  ('600100', 'Pallikaranai'),
  ('600101', 'Annanagar West Extn'),
  ('600102', 'Mogappair'),
  ('600106', 'Arumbakkam'),
  ('600107', 'Mogappair East'),
  ('600113', 'Taramani'),
  ('600115', 'Tambaram Sanatorium'),
  ('600116', 'Porur'),
  ('600117', 'Medavakkam'),
  ('600118', 'Velappanchavadi'),
  ('600119', 'Sholinganallur'),
  ('600122', 'Kelambakkam'),
  ('600123', 'Periyapalayam'),
  ('600125', 'Avadi'),
  ('600127', 'OMR / Padur')
on conflict (pincode) do nothing;

notify pgrst, 'reload schema';
