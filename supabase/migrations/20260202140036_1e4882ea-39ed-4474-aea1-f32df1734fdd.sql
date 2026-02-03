-- Add new fields to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS street2 text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS avatar_color text DEFAULT '#8B5CF6';

-- Add billing status and invoice linking to time_entries
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS billing_status text DEFAULT 'unbilled',
ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Add column visibility settings to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS invoice_show_quantity boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_show_rate boolean DEFAULT true;

-- Create taxes table
CREATE TABLE IF NOT EXISTS public.taxes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on taxes
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for taxes
CREATE POLICY "Users can view their own taxes" 
ON public.taxes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own taxes" 
ON public.taxes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own taxes" 
ON public.taxes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own taxes" 
ON public.taxes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_time_entries_billing_status ON public.time_entries(billing_status);
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice_id ON public.time_entries(invoice_id);