-- Notes: Notion-style documents with rich text, linkable to clients, projects, tasks

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text, -- HTML from rich text editor
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_updated_at_idx on public.notes(updated_at desc);

alter table public.notes enable row level security;

create policy "Users can manage own notes"
  on public.notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.notes is 'User notes/documents with rich text; content can link to clients, projects, tasks.';
