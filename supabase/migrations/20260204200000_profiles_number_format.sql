-- Add number_format to profiles for locale-aware number display (e.g. 1,234.56 vs 1.234,56)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS number_format text DEFAULT '1,234.56';

COMMENT ON COLUMN public.profiles.number_format IS 'Number format pattern: 1,234.56 (US/UK), 1.234,56 (European), 1 234,56 (French), 1''234.56 (Swiss)';
