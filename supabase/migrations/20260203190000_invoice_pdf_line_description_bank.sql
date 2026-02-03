-- Optional line item description (extra details; main item name stays in description)
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS line_description TEXT;

-- Per-invoice bank details override (when set, used instead of profile default)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS bank_details TEXT;

-- Profile: show/hide the line description column on invoice PDFs
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invoice_show_line_description boolean DEFAULT true;
