-- Public bucket for admin-uploaded site media (hero / package videos, etc.).
-- Public so the files can be used directly as <video src>. Uploads go through
-- the service-role key from the admin; reads are public.

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
