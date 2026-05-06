-- CRM follow-up todos: allow multiple actions/reminders per client

create table if not exists public.client_follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  details text,
  due_at timestamptz,
  remind_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_follow_ups_title_nonempty check (length(trim(title)) > 0)
);

create index if not exists idx_client_follow_ups_user_open_due
  on public.client_follow_ups (user_id, completed_at, due_at);

create index if not exists idx_client_follow_ups_user_open_remind
  on public.client_follow_ups (user_id, completed_at, remind_at);

create index if not exists idx_client_follow_ups_client
  on public.client_follow_ups (client_id);

alter table public.client_follow_ups enable row level security;

drop policy if exists "Users can view their own client follow-ups" on public.client_follow_ups;
create policy "Users can view their own client follow-ups"
  on public.client_follow_ups for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own client follow-ups" on public.client_follow_ups;
create policy "Users can insert their own client follow-ups"
  on public.client_follow_ups for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update their own client follow-ups" on public.client_follow_ups;
create policy "Users can update their own client follow-ups"
  on public.client_follow_ups for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own client follow-ups" on public.client_follow_ups;
create policy "Users can delete their own client follow-ups"
  on public.client_follow_ups for delete
  using (auth.uid() = user_id);

drop trigger if exists update_client_follow_ups_updated_at on public.client_follow_ups;
create trigger update_client_follow_ups_updated_at
  before update on public.client_follow_ups
  for each row execute function public.update_updated_at_column();

