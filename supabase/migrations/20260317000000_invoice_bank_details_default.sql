-- Default bank / payment details for new invoices (same mechanics as invoice_footer and invoice_notes_default)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invoice_bank_details_default TEXT;
