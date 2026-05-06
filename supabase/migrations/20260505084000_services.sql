create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  price numeric,
  currency text not null default 'USD',
  is_recurring boolean not null default false,
  default_tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_user_id_idx on public.services(user_id);
create index if not exists services_created_at_idx on public.services(created_at desc);

alter table public.services enable row level security;

drop policy if exists "Users can manage their own services" on public.services;
create policy "Users can manage their own services"
  on public.services
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists update_services_updated_at on public.services;
create trigger update_services_updated_at
  before update on public.services
  for each row execute function public.update_updated_at_column();
