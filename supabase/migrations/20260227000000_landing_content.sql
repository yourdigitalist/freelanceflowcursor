-- Landing page content (single row, editable from admin)
create table if not exists public.landing_content (
  id int primary key default 1 check (id = 1),
  content jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Seed default row so admin can edit
insert into public.landing_content (id, content, updated_at)
values (1, '{}', now())
on conflict (id) do update set updated_at = now();

-- Allow read for anon (public landing) and all for authenticated (admin will use service role or auth)
alter table public.landing_content enable row level security;

create policy "Landing content is readable by everyone"
  on public.landing_content for select
  using (true);

create policy "Only admins can update landing content"
  on public.landing_content for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Only admins can insert landing content"
  on public.landing_content for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid() and profiles.is_admin = true
    )
  );

-- Storage bucket for landing page images (create via Supabase Dashboard or API; policy below assumes bucket name 'landing-images')
-- If bucket doesn't exist, create it in Dashboard: Storage > New bucket > landing-images (public)
insert into storage.buckets (id, name, public)
values ('landing-images', 'landing-images', true)
on conflict (id) do nothing;

create policy "Anyone can view landing images"
  on storage.objects for select
  using (bucket_id = 'landing-images');

create policy "Authenticated admins can upload landing images"
  on storage.objects for insert
  with check (
    bucket_id = 'landing-images'
    and exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Authenticated admins can update landing images"
  on storage.objects for update
  using (
    bucket_id = 'landing-images'
    and exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Authenticated admins can delete landing images"
  on storage.objects for delete
  using (
    bucket_id = 'landing-images'
    and exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid() and profiles.is_admin = true
    )
  );
