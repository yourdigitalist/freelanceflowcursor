-- Track when invoices were first sent and last emailed to clients (non-reminder).
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.invoices.sent_at IS 'When the invoice was first emailed to the client.';
COMMENT ON COLUMN public.invoices.last_sent_at IS 'When the invoice was last emailed to the client (excludes automatic reminders).';
