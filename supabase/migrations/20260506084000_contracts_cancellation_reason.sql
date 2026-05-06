alter table public.contracts
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

