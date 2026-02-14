-- Invoice number configuration (prefix, include year, start, padding, reset yearly)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS invoice_include_year BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_number_start INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS invoice_number_padding INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS invoice_number_reset_yearly BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_number_next INTEGER,
ADD COLUMN IF NOT EXISTS invoice_number_last_year INTEGER;

-- Allow empty prefix (some users want pure numbers); default remains INV- for existing, new config uses INV in UI
COMMENT ON COLUMN public.profiles.invoice_prefix IS 'Invoice number prefix, e.g. INV or empty for numbers only';
