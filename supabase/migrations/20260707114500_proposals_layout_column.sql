alter table public.proposals
add column if not exists layout jsonb null;
