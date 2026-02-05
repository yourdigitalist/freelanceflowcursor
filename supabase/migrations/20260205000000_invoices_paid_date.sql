-- Add paid_date to invoices (set when status becomes paid)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.invoices.paid_date IS 'When the invoice was marked as paid (for display on PDF and in app)';
