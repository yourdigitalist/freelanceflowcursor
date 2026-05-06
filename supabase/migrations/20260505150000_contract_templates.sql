create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  content text not null default '',
  is_default boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contract_templates enable row level security;

drop policy if exists "Users manage their own contract_templates" on public.contract_templates;
create policy "Users manage their own contract_templates"
on public.contract_templates
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop trigger if exists update_contract_templates_updated_at on public.contract_templates;
create trigger update_contract_templates_updated_at
before update on public.contract_templates
for each row execute function public.update_updated_at_column();

alter table public.contracts
  add column if not exists template_id uuid references public.contract_templates(id) on delete set null,
  add column if not exists client_company_name text,
  add column if not exists client_tax_id text,
  add column if not exists client_company_registration text,
  add column if not exists client_complement text,
  add column if not exists freelancer_complement text,
  add column if not exists freelancer_company_name text,
  add column if not exists freelancer_tax_id text,
  add column if not exists freelancer_company_registration text;

alter table public.clients
  add column if not exists entity_type text default 'individual' check (entity_type in ('individual', 'company')),
  add column if not exists company_name text,
  add column if not exists tax_id text,
  add column if not exists company_registration text;
