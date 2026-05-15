-- Client archive + proposal client name snapshots

alter table public.clients
  add column if not exists archived_at timestamptz;

create index if not exists clients_user_archived_idx
  on public.clients (user_id, archived_at)
  where archived_at is null;

alter table public.proposals
  add column if not exists client_name_snapshot text,
  add column if not exists client_company_snapshot text;

update public.proposals p
set
  client_name_snapshot = c.name,
  client_company_snapshot = c.company
from public.clients c
where c.id = p.client_id
  and (p.client_name_snapshot is null or btrim(p.client_name_snapshot) = '');
