ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS is_lance_template boolean NOT NULL DEFAULT false;

-- Backfill the original seeded template only.
UPDATE public.contract_templates
SET is_lance_template = true
WHERE is_lance_template = false
  AND is_default = true
  AND lower(trim(name)) = 'service agreement'
  AND lower(trim(coalesce(description, ''))) = 'standard english template for freelance services agreements.';
