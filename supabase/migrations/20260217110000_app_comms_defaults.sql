-- Global comms defaults (invoice footer, email templates, reminder copy). Single row, admin-editable.
CREATE TABLE IF NOT EXISTS public.app_comms_defaults (
  id INT PRIMARY KEY DEFAULT 1,
  invoice_footer TEXT,
  invoice_email_subject_default TEXT,
  invoice_email_message_default TEXT,
  reminder_subject_default TEXT,
  reminder_body_default TEXT,
  email_header_html TEXT,
  email_footer_html TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_comms_defaults_single_row CHECK (id = 1)
);

INSERT INTO public.app_comms_defaults (id, updated_at)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_comms_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_comms_defaults"
  ON public.app_comms_defaults FOR SELECT
  USING (true);

CREATE POLICY "Admins can update app_comms_defaults"
  ON public.app_comms_defaults FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can insert app_comms_defaults"
  ON public.app_comms_defaults FOR INSERT
  WITH CHECK (
    id = 1 AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

COMMENT ON TABLE public.app_comms_defaults IS 'App-wide default copy for invoices and emails. Users can override in their settings.';
