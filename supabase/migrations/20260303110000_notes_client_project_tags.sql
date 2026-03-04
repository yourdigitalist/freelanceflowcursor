-- Add client, project, and tags to notes

alter table public.notes
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists tags text[] default '{}';

create index if not exists notes_client_id_idx on public.notes(client_id);
create index if not exists notes_project_id_idx on public.notes(project_id);

comment on column public.notes.tags is 'Tags for the note (e.g. meeting, follow-up).';
