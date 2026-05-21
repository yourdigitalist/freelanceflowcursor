-- Editable copy for account-deletion confirmation emails (Lance → user).
ALTER TABLE public.app_comms_defaults
  ADD COLUMN IF NOT EXISTS account_deleted_subject TEXT,
  ADD COLUMN IF NOT EXISTS account_deleted_body TEXT;

COMMENT ON COLUMN public.app_comms_defaults.account_deleted_subject IS 'Subject for account deleted confirmation email.';
COMMENT ON COLUMN public.app_comms_defaults.account_deleted_body IS 'Body for account deleted email. Tokens: {{user_name}}, {{support_url}}.';
