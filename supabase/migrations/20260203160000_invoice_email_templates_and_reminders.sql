-- Email template and reminder settings for invoices
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invoice_email_subject_default TEXT,
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reminder_subject_default TEXT,
  ADD COLUMN IF NOT EXISTS reminder_body_default TEXT;
