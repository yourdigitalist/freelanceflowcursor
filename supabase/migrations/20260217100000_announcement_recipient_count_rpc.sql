-- Admin-only: count of users who will receive an announcement (onboarding completed, has email).
CREATE OR REPLACE FUNCTION public.get_announcement_recipient_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
  cnt integer;
BEGIN
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()), false)
  INTO caller_is_admin;

  IF NOT caller_is_admin THEN
    RETURN 0;
  END IF;

  SELECT count(*)::integer INTO cnt
  FROM public.profiles
  WHERE coalesce(onboarding_completed, false) = true
    AND trim(coalesce(email, '')) != '';

  RETURN cnt;
END;
$$;

COMMENT ON FUNCTION public.get_announcement_recipient_count() IS 'Returns count of active users (onboarding done, has email) for announcement preview. Admin only.';
