create sequence if not exists public.contract_identifier_seq;

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  identifier text not null default '',
  status text not null default 'draft' check (status in ('draft', 'pending_signatures', 'signed', 'cancelled')),
  client_name text,
  client_email text,
  client_phone text,
  client_address text,
  client_city text,
  client_state text,
  client_zip text,
  client_country text,
  client_entity_type text not null default 'individual' check (client_entity_type in ('individual', 'company')),
  freelancer_name text,
  freelancer_email text,
  freelancer_phone text,
  freelancer_address text,
  freelancer_city text,
  freelancer_state text,
  freelancer_zip text,
  freelancer_country text,
  timeline_days integer,
  reminder_near_end boolean not null default false,
  immediate_availability boolean not null default true,
  payment_structure text check (payment_structure in ('upfront', 'installments')),
  installment_description text,
  payment_methods text[] not null default '{}',
  payment_link text,
  additional_clause text,
  subtotal numeric not null default 0,
  discount numeric,
  discount_type text check (discount_type in ('percent', 'fixed')),
  total numeric not null default 0,
  public_token uuid not null default gen_random_uuid() unique,
  freelancer_signed_at timestamptz,
  freelancer_signed_name text,
  client_signed_at timestamptz,
  client_signed_name text,
  client_sign_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, identifier)
);

create table if not exists public.contract_services (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  name text not null,
  description text,
  price numeric,
  quantity integer not null default 1,
  sort_order integer not null default 0
);

create table if not exists public.contract_sign_tokens (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists contracts_user_id_idx on public.contracts(user_id);
create index if not exists contracts_status_idx on public.contracts(status);
create index if not exists contracts_client_id_idx on public.contracts(client_id);
create index if not exists contracts_project_id_idx on public.contracts(project_id);
create index if not exists contracts_proposal_id_idx on public.contracts(proposal_id);
create index if not exists contract_services_contract_id_idx on public.contract_services(contract_id);
create index if not exists contract_sign_tokens_lookup_idx on public.contract_sign_tokens(contract_id, email, created_at desc);
create index if not exists contract_sign_tokens_verify_idx on public.contract_sign_tokens(contract_id, code, used_at, expires_at);

create or replace function public.generate_contract_identifier()
returns trigger
language plpgsql
as $$
begin
  if new.identifier is null or btrim(new.identifier) = '' then
    new.identifier := 'C-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.contract_identifier_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create or replace function public.contracts_lock_after_send()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('pending_signatures', 'signed', 'cancelled') then
    if (new.client_id is distinct from old.client_id)
      or (new.project_id is distinct from old.project_id)
      or (new.proposal_id is distinct from old.proposal_id)
      or (new.identifier is distinct from old.identifier)
      or (new.client_name is distinct from old.client_name)
      or (new.client_email is distinct from old.client_email)
      or (new.client_phone is distinct from old.client_phone)
      or (new.client_address is distinct from old.client_address)
      or (new.client_city is distinct from old.client_city)
      or (new.client_state is distinct from old.client_state)
      or (new.client_zip is distinct from old.client_zip)
      or (new.client_country is distinct from old.client_country)
      or (new.client_entity_type is distinct from old.client_entity_type)
      or (new.freelancer_name is distinct from old.freelancer_name)
      or (new.freelancer_email is distinct from old.freelancer_email)
      or (new.freelancer_phone is distinct from old.freelancer_phone)
      or (new.freelancer_address is distinct from old.freelancer_address)
      or (new.freelancer_city is distinct from old.freelancer_city)
      or (new.freelancer_state is distinct from old.freelancer_state)
      or (new.freelancer_zip is distinct from old.freelancer_zip)
      or (new.freelancer_country is distinct from old.freelancer_country)
      or (new.timeline_days is distinct from old.timeline_days)
      or (new.reminder_near_end is distinct from old.reminder_near_end)
      or (new.immediate_availability is distinct from old.immediate_availability)
      or (new.payment_structure is distinct from old.payment_structure)
      or (new.installment_description is distinct from old.installment_description)
      or (new.payment_methods is distinct from old.payment_methods)
      or (new.payment_link is distinct from old.payment_link)
      or (new.additional_clause is distinct from old.additional_clause)
      or (new.subtotal is distinct from old.subtotal)
      or (new.discount is distinct from old.discount)
      or (new.discount_type is distinct from old.discount_type)
      or (new.total is distinct from old.total)
    then
      raise exception 'Contract is read-only after it has been sent.';
    end if;
  end if;

  if new.project_id is not null and new.client_id is not null then
    if not exists (
      select 1
      from public.projects p
      where p.id = new.project_id
        and p.client_id = new.client_id
    ) then
      raise exception 'Selected project is not linked to selected client.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_contract_identifier on public.contracts;
create trigger set_contract_identifier
before insert on public.contracts
for each row
when (new.identifier = '')
execute function public.generate_contract_identifier();

drop trigger if exists update_contracts_updated_at on public.contracts;
create trigger update_contracts_updated_at
before update on public.contracts
for each row execute function public.update_updated_at_column();

drop trigger if exists contracts_lock_after_send on public.contracts;
create trigger contracts_lock_after_send
before update on public.contracts
for each row execute function public.contracts_lock_after_send();

alter table public.contracts enable row level security;
alter table public.contract_services enable row level security;
alter table public.contract_sign_tokens enable row level security;

drop policy if exists "Users manage their own contracts" on public.contracts;
create policy "Users manage their own contracts"
on public.contracts
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own contract_services" on public.contract_services;
create policy "Users manage their own contract_services"
on public.contract_services
for all
using (
  exists (
    select 1 from public.contracts c
    where c.id = contract_services.contract_id
      and c.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.contracts c
    where c.id = contract_services.contract_id
      and c.user_id = (select auth.uid())
  )
);
