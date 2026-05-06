alter table public.profiles
  add column if not exists proposal_default_cover_image_url text,
  add column if not exists proposal_default_validity_days integer not null default 30,
  add column if not exists proposal_default_immediate_availability boolean not null default true,
  add column if not exists proposal_default_payment_structure text
    check (proposal_default_payment_structure in ('upfront', 'installments')),
  add column if not exists proposal_default_payment_methods text[] not null default '{}',
  add column if not exists proposal_default_conditions_notes text,
  add column if not exists proposal_default_installment_description text;
