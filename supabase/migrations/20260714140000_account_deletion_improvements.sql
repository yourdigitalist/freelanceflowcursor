-- Account deletion: multi-stage warnings, export tokens, soft delete + 30-day restore window.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_reminder_3d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_reminder_1d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_export_token text,
  ADD COLUMN IF NOT EXISTS account_soft_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS restore_until timestamptz;

COMMENT ON COLUMN public.profiles.deletion_reminder_3d_sent_at IS
  'When the 3-days-left deletion reminder email was sent.';
COMMENT ON COLUMN public.profiles.deletion_reminder_1d_sent_at IS
  'When the 1-day-left deletion reminder email was sent.';
COMMENT ON COLUMN public.profiles.deletion_export_token IS
  'Token for pre-deletion data export link in warning emails.';
COMMENT ON COLUMN public.profiles.account_soft_deleted_at IS
  'When the account was deactivated by automated cleanup (ban + restore window).';
COMMENT ON COLUMN public.profiles.restore_until IS
  'Last date admin can restore a soft-deleted account (typically +30 days).';

DROP FUNCTION IF EXISTS public.get_deletion_warning_candidates();
DROP FUNCTION IF EXISTS public.get_account_deletion_candidates();

CREATE OR REPLACE FUNCTION public.clear_profile_deletion_schedule(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    deletion_warning_sent = false,
    deletion_warning_sent_at = NULL,
    scheduled_deletion_at = NULL,
    deletion_reminder_3d_sent_at = NULL,
    deletion_reminder_1d_sent_at = NULL,
    deletion_export_token = NULL
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.clear_profile_deletion_schedule(uuid) IS
  'Service role / triggers: clear automated deletion warning state when user subscribes.';

CREATE OR REPLACE FUNCTION public.clear_deletion_schedule_on_active_subscription()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF lower(COALESCE(NEW.subscription_status, '')) = 'active'
     AND lower(COALESCE(OLD.subscription_status, '')) <> 'active' THEN
    NEW.deletion_warning_sent := false;
    NEW.deletion_warning_sent_at := NULL;
    NEW.scheduled_deletion_at := NULL;
    NEW.deletion_reminder_3d_sent_at := NULL;
    NEW.deletion_reminder_1d_sent_at := NULL;
    NEW.deletion_export_token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_deletion_schedule_on_active_subscription_trigger ON public.profiles;
CREATE TRIGGER clear_deletion_schedule_on_active_subscription_trigger
BEFORE UPDATE OF subscription_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.clear_deletion_schedule_on_active_subscription();

-- Initial warning: trial ended 7+ days ago, no schedule yet.
CREATE OR REPLACE FUNCTION public.get_deletion_warning_candidates()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  trial_end_date timestamptz,
  scheduled_deletion_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    p.user_id,
    p.email,
    nullif(trim(coalesce(p.full_name, concat_ws(' ', p.first_name, p.last_name))), '') AS full_name,
    p.trial_end_date,
    (now() + interval '7 days') AS scheduled_deletion_at
  FROM public.profiles p
  WHERE p.is_lifetime = false
    AND COALESCE(p.is_admin, false) = false
    AND p.account_soft_deleted_at IS NULL
    AND COALESCE(p.deletion_warning_sent, false) = false
    AND lower(COALESCE(p.subscription_status, '')) NOT IN ('active')
    AND p.trial_end_date IS NOT NULL
    AND p.trial_end_date < (now() - interval '7 days')
    AND p.email IS NOT NULL
    AND trim(p.email) <> '';
$$;

-- 3 days left (first reminder after initial warning).
CREATE OR REPLACE FUNCTION public.get_deletion_reminder_3d_candidates()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  scheduled_deletion_at timestamptz,
  deletion_export_token text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    p.user_id,
    p.email,
    nullif(trim(coalesce(p.full_name, concat_ws(' ', p.first_name, p.last_name))), '') AS full_name,
    p.scheduled_deletion_at,
    p.deletion_export_token
  FROM public.profiles p
  WHERE p.is_lifetime = false
    AND COALESCE(p.is_admin, false) = false
    AND p.account_soft_deleted_at IS NULL
    AND COALESCE(p.deletion_warning_sent, false) = true
    AND p.scheduled_deletion_at IS NOT NULL
    AND p.scheduled_deletion_at > now()
    AND p.scheduled_deletion_at <= (now() + interval '3 days')
    AND p.deletion_reminder_3d_sent_at IS NULL
    AND lower(COALESCE(p.subscription_status, '')) NOT IN ('active')
    AND p.email IS NOT NULL
    AND trim(p.email) <> '';
$$;

-- 1 day left (final reminder).
CREATE OR REPLACE FUNCTION public.get_deletion_reminder_1d_candidates()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  scheduled_deletion_at timestamptz,
  deletion_export_token text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    p.user_id,
    p.email,
    nullif(trim(coalesce(p.full_name, concat_ws(' ', p.first_name, p.last_name))), '') AS full_name,
    p.scheduled_deletion_at,
    p.deletion_export_token
  FROM public.profiles p
  WHERE p.is_lifetime = false
    AND COALESCE(p.is_admin, false) = false
    AND p.account_soft_deleted_at IS NULL
    AND COALESCE(p.deletion_warning_sent, false) = true
    AND p.scheduled_deletion_at IS NOT NULL
    AND p.scheduled_deletion_at > now()
    AND p.scheduled_deletion_at <= (now() + interval '1 day')
    AND p.deletion_reminder_1d_sent_at IS NULL
    AND lower(COALESCE(p.subscription_status, '')) NOT IN ('active')
    AND p.email IS NOT NULL
    AND trim(p.email) <> '';
$$;

-- Soft-delete when scheduled date passes (login alone does NOT cancel — only active subscription).
CREATE OR REPLACE FUNCTION public.get_account_deletion_candidates()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  stripe_customer_id text,
  stripe_subscription_id text,
  deletion_export_token text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    p.user_id,
    p.email,
    nullif(trim(coalesce(p.full_name, concat_ws(' ', p.first_name, p.last_name))), '') AS full_name,
    p.stripe_customer_id,
    p.stripe_subscription_id,
    p.deletion_export_token
  FROM public.profiles p
  WHERE p.is_lifetime = false
    AND COALESCE(p.is_admin, false) = false
    AND p.account_soft_deleted_at IS NULL
    AND COALESCE(p.deletion_warning_sent, false) = true
    AND p.scheduled_deletion_at IS NOT NULL
    AND p.scheduled_deletion_at <= now()
    AND lower(COALESCE(p.subscription_status, '')) NOT IN ('active');
$$;

-- Permanent delete after restore window expires.
CREATE OR REPLACE FUNCTION public.get_permanent_deletion_candidates()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  stripe_customer_id text,
  stripe_subscription_id text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    p.user_id,
    p.email,
    nullif(trim(coalesce(p.full_name, concat_ws(' ', p.first_name, p.last_name))), '') AS full_name,
    p.stripe_customer_id,
    p.stripe_subscription_id
  FROM public.profiles p
  WHERE p.account_soft_deleted_at IS NOT NULL
    AND p.restore_until IS NOT NULL
    AND p.restore_until <= now();
$$;

-- Admin: list accounts that can still be restored (admin-only).
CREATE OR REPLACE FUNCTION public.get_restorable_accounts()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  account_soft_deleted_at timestamptz,
  restore_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND COALESCE(p.is_admin, false) = true
  ) THEN
    RAISE EXCEPTION 'Admin required';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.email,
    nullif(trim(coalesce(p.full_name, concat_ws(' ', p.first_name, p.last_name))), '') AS full_name,
    p.account_soft_deleted_at,
    p.restore_until
  FROM public.profiles p
  WHERE p.account_soft_deleted_at IS NOT NULL
    AND p.restore_until IS NOT NULL
    AND p.restore_until > now()
  ORDER BY p.restore_until ASC;
END;
$$;

COMMENT ON FUNCTION public.get_deletion_reminder_3d_candidates() IS
  'Service role: 3-days-left deletion reminder email candidates.';
COMMENT ON FUNCTION public.get_deletion_reminder_1d_candidates() IS
  'Service role: 1-day-left deletion reminder email candidates.';
COMMENT ON FUNCTION public.get_permanent_deletion_candidates() IS
  'Service role: soft-deleted accounts past restore deadline — permanent delete.';
COMMENT ON FUNCTION public.get_restorable_accounts() IS
  'Service role / admin: soft-deleted accounts still within restore window.';
