-- CRM v1: richer client stages + follow-ups + activity timeline

-- Expand client status values from (active, inactive, lead) to a CRM stage pipeline.
-- Normalize old "lead" to the new initial stage "lead_new".
update public.clients
set status = 'lead_new'
where status = 'lead';

-- Drop existing check constraint (created by initial table definition).
alter table public.clients
  drop constraint if exists clients_status_check;

alter table public.clients
  add constraint clients_status_check
  check (
    status in (
      'lead_new',
      'lead_contacted',
      'lead_qualified',
      'proposal_sent',
      'negotiation',
      'won',
      'onboarding',
      'active',
      'paused',
      'inactive',
      'closed_lost'
    )
  );

-- Add CRM fields to clients
alter table public.clients
  add column if not exists next_action text,
  add column if not exists next_follow_up_at timestamp with time zone,
  add column if not exists lead_source text,
  add column if not exists estimated_value numeric(12,2),
  add column if not exists currency text default 'USD',
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists last_contacted_at timestamp with time zone;

create index if not exists idx_clients_user_follow_up
  on public.clients (user_id, next_follow_up_at);

-- Activity timeline per client (notes, calls, meetings, etc.)
create table if not exists public.client_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null default 'note' check (type in ('note', 'email', 'call', 'meeting', 'other')),
  body text not null,
  occurred_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_client_activities_client_occurred
  on public.client_activities (client_id, occurred_at desc);

alter table public.client_activities enable row level security;

create policy "Users can view their own client activities"
  on public.client_activities for select
  using (auth.uid() = user_id);

create policy "Users can insert their own client activities"
  on public.client_activities for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.user_id = auth.uid()
    )
  );

create policy "Users can update their own client activities"
  on public.client_activities for update
  using (auth.uid() = user_id);

create policy "Users can delete their own client activities"
  on public.client_activities for delete
  using (auth.uid() = user_id);

-- Keep updated_at current on edits
drop trigger if exists update_client_activities_updated_at on public.client_activities;
create trigger update_client_activities_updated_at
  before update on public.client_activities
  for each row execute function public.update_updated_at_column();

