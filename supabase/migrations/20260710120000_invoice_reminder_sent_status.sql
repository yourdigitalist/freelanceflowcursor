-- Invoice reminder tracking and reminder_sent status.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reminder_automatic BOOLEAN;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'reminder_sent', 'paid', 'overdue', 'cancelled'));
