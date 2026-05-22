-- Prefer DD/MM/YYYY for new profiles; existing saved preferences are unchanged.
ALTER TABLE public.profiles
  ALTER COLUMN date_format SET DEFAULT 'DD/MM/YYYY';
