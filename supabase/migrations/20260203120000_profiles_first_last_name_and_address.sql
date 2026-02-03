-- Add first_name, last_name and structured business address to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS business_street TEXT,
ADD COLUMN IF NOT EXISTS business_street2 TEXT,
ADD COLUMN IF NOT EXISTS business_city TEXT,
ADD COLUMN IF NOT EXISTS business_state TEXT,
ADD COLUMN IF NOT EXISTS business_postal_code TEXT,
ADD COLUMN IF NOT EXISTS business_country TEXT;
