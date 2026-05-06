create sequence if not exists public.proposal_identifier_seq;

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  identifier text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'read', 'accepted', 'archived')),
  public_token uuid not null default gen_random_uuid(),
  objective text,
  presentation text,
  validity_days integer not null default 30,
  expires_at date,
  cover_image_url text,
  subtotal numeric not null default 0,
  discount_type text not null default 'amount' check (discount_type in ('amount', 'percent')),
  discount_value numeric not null default 0,
  total numeric not null default 0,
  availability_required boolean not null default false,
  timeline_days integer,
  payment_structure text check (payment_structure in ('upfront', 'installments')),
  payment_methods text[] not null default '{}',
  conditions_notes text,
  sent_at timestamptz,
  read_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (public_token),
  unique (user_id, identifier)
);

create table if not exists public.proposal_services (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  name text not null,
  description text,
  price numeric not null default 0,
  currency text not null default 'USD',
  is_recurring boolean not null default false,
  recurrence_period text not null default 'monthly' check (recurrence_period in ('monthly', 'annually')),
  quantity numeric not null default 1,
  position integer not null default 0,
  line_total numeric not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.generate_proposal_identifier()
returns trigger
language plpgsql
as $$
begin
  if new.identifier is null or btrim(new.identifier) = '' then
    new.identifier := 'P-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.proposal_identifier_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists assign_proposal_identifier on public.proposals;
create trigger assign_proposal_identifier
before insert on public.proposals
for each row execute function public.generate_proposal_identifier();

drop trigger if exists update_proposals_updated_at on public.proposals;
create trigger update_proposals_updated_at
before update on public.proposals
for each row execute function public.update_updated_at_column();

create index if not exists proposals_user_id_idx on public.proposals(user_id);
create index if not exists proposals_client_id_idx on public.proposals(client_id);
create index if not exists proposals_project_id_idx on public.proposals(project_id);
create index if not exists proposals_public_token_idx on public.proposals(public_token);
create index if not exists proposal_services_proposal_id_idx on public.proposal_services(proposal_id);
create index if not exists proposal_services_service_id_idx on public.proposal_services(service_id);

alter table public.proposals enable row level security;
alter table public.proposal_services enable row level security;

drop policy if exists "Users can manage their own proposals" on public.proposals;
create policy "Users can manage their own proposals"
  on public.proposals
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage proposal services through parent proposal" on public.proposal_services;
create policy "Users can manage proposal services through parent proposal"
  on public.proposal_services
  for all
  using (
    exists (
      select 1
      from public.proposals p
      where p.id = proposal_services.proposal_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.proposals p
      where p.id = proposal_services.proposal_id
        and p.user_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public)
values ('proposal-images', 'proposal-images', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload proposal images" on storage.objects;
create policy "Users can upload proposal images"
  on storage.objects for insert
  with check (bucket_id = 'proposal-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can view own proposal images" on storage.objects;
create policy "Users can view own proposal images"
  on storage.objects for select
  using (bucket_id = 'proposal-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own proposal images" on storage.objects;
create policy "Users can update own proposal images"
  on storage.objects for update
  using (bucket_id = 'proposal-images' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'proposal-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own proposal images" on storage.objects;
create policy "Users can delete own proposal images"
  on storage.objects for delete
  using (bucket_id = 'proposal-images' and auth.uid()::text = (storage.foldername(name))[1]);
