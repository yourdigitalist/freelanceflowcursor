alter table public.contracts
  add column if not exists client_company text,
  add column if not exists freelancer_company text;
