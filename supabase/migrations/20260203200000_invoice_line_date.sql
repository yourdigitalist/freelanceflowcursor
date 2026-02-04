-- Optional line item date (e.g. date of service)
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS line_date DATE;

-- Profile: show/hide line item date on invoice PDFs
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invoice_show_line_date boolean DEFAULT false;
