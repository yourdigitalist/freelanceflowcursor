alter table public.contracts
  add column if not exists sent_at timestamptz,
  add column if not exists client_tax_id text,
  add column if not exists freelancer_tax_id text,
  add column if not exists client_street text,
  add column if not exists client_street2 text,
  add column if not exists freelancer_street text,
  add column if not exists freelancer_street2 text,
  add column if not exists client_sign_geo text,
  add column if not exists client_sign_device text,
  add column if not exists client_sign_isp text,
  add column if not exists client_sign_email_verified boolean not null default false,
  add column if not exists freelancer_sign_ip text,
  add column if not exists freelancer_sign_geo text,
  add column if not exists freelancer_sign_device text,
  add column if not exists freelancer_sign_isp text,
  add column if not exists freelancer_sign_email_verified boolean not null default false;

create index if not exists contracts_sent_at_idx on public.contracts(sent_at);
