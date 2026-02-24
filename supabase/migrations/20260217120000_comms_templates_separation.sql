-- Separate Lance -> User email templates from User -> Client email templates.
-- Also adds editable body templates for automated Lance emails.

ALTER TABLE public.app_comms_defaults
  ADD COLUMN IF NOT EXISTS lance_email_header_html TEXT,
  ADD COLUMN IF NOT EXISTS lance_email_footer_html TEXT,
  ADD COLUMN IF NOT EXISTS trial_body_5d TEXT,
  ADD COLUMN IF NOT EXISTS trial_body_1d TEXT,
  ADD COLUMN IF NOT EXISTS trial_body_0d TEXT,
  ADD COLUMN IF NOT EXISTS announcement_default_body TEXT,
  ADD COLUMN IF NOT EXISTS announcement_custom_html TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_email_primary_color TEXT,
  ADD COLUMN IF NOT EXISTS client_email_header_html TEXT,
  ADD COLUMN IF NOT EXISTS client_email_footer_html TEXT;

COMMENT ON COLUMN public.app_comms_defaults.lance_email_header_html IS 'Default Lance->User email header HTML.';
COMMENT ON COLUMN public.app_comms_defaults.lance_email_footer_html IS 'Default Lance->User email footer HTML.';
COMMENT ON COLUMN public.app_comms_defaults.trial_body_5d IS 'Default trial reminder body (5 days left).';
COMMENT ON COLUMN public.app_comms_defaults.trial_body_1d IS 'Default trial reminder body (1 day left).';
COMMENT ON COLUMN public.app_comms_defaults.trial_body_0d IS 'Default trial reminder body (0 days left).';
COMMENT ON COLUMN public.app_comms_defaults.announcement_default_body IS 'Default announcement body text when sender leaves body empty.';
COMMENT ON COLUMN public.app_comms_defaults.announcement_custom_html IS 'Optional full custom HTML template for announcements.';

COMMENT ON COLUMN public.profiles.client_email_primary_color IS 'User brand color for client-facing emails.';
COMMENT ON COLUMN public.profiles.client_email_header_html IS 'Optional custom header HTML for user->client emails.';
COMMENT ON COLUMN public.profiles.client_email_footer_html IS 'Optional custom footer HTML for user->client emails.';
