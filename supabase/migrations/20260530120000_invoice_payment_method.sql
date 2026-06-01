-- Payment method recorded when an invoice is marked as paid (shown on invoice/receipt)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_method text;

COMMENT ON COLUMN public.invoices.payment_method IS 'How the client paid (e.g. bank_transfer, card, or other: custom label)';
