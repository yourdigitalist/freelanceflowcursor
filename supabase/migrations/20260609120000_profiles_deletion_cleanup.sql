-- Inactive account cleanup: deletion warning tracking + service-only candidate queries.
-- Excludes is_lifetime users. Used by cleanup-inactive-accounts Edge Function (daily cron).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_warning_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deletion_warning_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at timestamptz;

COMMENT ON COLUMN public.profiles.deletion_warning_sent IS
  'True after day-22 style deletion warning email was sent (trial ended, no active subscription).';
COMMENT ON COLUMN public.profiles.deletion_warning_sent_at IS
  'When the deletion warning email was sent.';
COMMENT ON COLUMN public.profiles.scheduled_deletion_at IS
  'When the account will be deleted if still inactive and without an active subscription.';

-- Trial ended 7+ days ago, not active, no warning yet, not lifetime/admin.
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
    AND COALESCE(p.deletion_warning_sent, false) = false
    AND lower(COALESCE(p.subscription_status, '')) NOT IN ('active')
    AND p.trial_end_date IS NOT NULL
    AND p.trial_end_date < (now() - interval '7 days')
    AND p.email IS NOT NULL
    AND trim(p.email) <> '';
$$;

COMMENT ON FUNCTION public.get_deletion_warning_candidates() IS
  'Service role only: profiles eligible for deletion warning email (7+ days after trial end, not active).';

-- Warning sent 7+ days ago, still not active, ghosted 30+ days, not lifetime/admin.
CREATE OR REPLACE FUNCTION public.get_account_deletion_candidates()
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
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE p.is_lifetime = false
    AND COALESCE(p.is_admin, false) = false
    AND COALESCE(p.deletion_warning_sent, false) = true
    AND p.deletion_warning_sent_at IS NOT NULL
    AND p.deletion_warning_sent_at < (now() - interval '7 days')
    AND lower(COALESCE(p.subscription_status, '')) NOT IN ('active')
    AND (
      u.last_sign_in_at IS NULL
      OR u.last_sign_in_at < (now() - interval '30 days')
    );
$$;

COMMENT ON FUNCTION public.get_account_deletion_candidates() IS
  'Service role only: profiles eligible for automated deletion after warning period.';
