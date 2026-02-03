-- Per-invoice footer override and default email message for invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS invoice_footer TEXT;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS invoice_email_message_default TEXT;
