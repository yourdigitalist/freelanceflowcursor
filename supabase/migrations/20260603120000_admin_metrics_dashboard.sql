-- Admin metrics dashboard: summary stats + user list with last sign-in (admin only).

CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_is_admin boolean;
  month_start timestamptz := date_trunc('month', now());
  week_start timestamptz := date_trunc('week', now());
  total_signups integer;
  signups_week integer;
  signups_month integer;
  trial_users integer;
  paying_users integer;
  past_due_users integer;
  canceled_users integer;
  monthly_active integer;
  annual_active integer;
  mrr numeric;
  arr numeric;
  new_paid_month integer;
  new_mrr_month numeric;
  churned_month integer;
  active_trials integer;
  trials_expiring_7d integer;
  ever_trialed integer;
  converted_active integer;
  conversion_rate numeric;
BEGIN
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()), false)
  INTO caller_is_admin;

  IF NOT caller_is_admin THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT count(*)::integer INTO total_signups FROM public.profiles;
  SELECT count(*)::integer INTO signups_week FROM public.profiles WHERE created_at >= week_start;
  SELECT count(*)::integer INTO signups_month FROM public.profiles WHERE created_at >= month_start;

  SELECT count(*)::integer INTO trial_users
  FROM public.profiles WHERE lower(coalesce(subscription_status, '')) = 'trial';

  SELECT count(*)::integer INTO paying_users
  FROM public.profiles WHERE lower(coalesce(subscription_status, '')) = 'active';

  SELECT count(*)::integer INTO past_due_users
  FROM public.profiles WHERE lower(coalesce(subscription_status, '')) = 'past_due';

  SELECT count(*)::integer INTO canceled_users
  FROM public.profiles WHERE lower(coalesce(subscription_status, '')) IN ('canceled', 'cancelled');

  SELECT count(*)::integer INTO monthly_active
  FROM public.profiles
  WHERE lower(coalesce(subscription_status, '')) = 'active'
    AND lower(coalesce(plan_type, '')) IN ('pro_monthly', 'pro', 'team');

  SELECT count(*)::integer INTO annual_active
  FROM public.profiles
  WHERE lower(coalesce(subscription_status, '')) = 'active'
    AND lower(coalesce(plan_type, '')) = 'pro_annual';

  mrr := (monthly_active * 29) + (annual_active * (290.0 / 12.0));
  arr := mrr * 12;

  SELECT count(*)::integer INTO new_paid_month
  FROM public.profiles
  WHERE lower(coalesce(subscription_status, '')) = 'active'
    AND updated_at >= month_start
    AND created_at < month_start;

  new_mrr_month := (
    SELECT coalesce(sum(
      CASE
        WHEN lower(coalesce(plan_type, '')) = 'pro_annual' THEN 290.0 / 12.0
        ELSE 29
      END
    ), 0)
    FROM public.profiles
    WHERE lower(coalesce(subscription_status, '')) = 'active'
      AND updated_at >= month_start
      AND created_at < month_start
  );

  SELECT count(*)::integer INTO churned_month
  FROM public.profiles
  WHERE lower(coalesce(subscription_status, '')) IN ('canceled', 'cancelled')
    AND updated_at >= month_start;

  SELECT count(*)::integer INTO active_trials
  FROM public.profiles WHERE lower(coalesce(subscription_status, '')) = 'trial';

  SELECT count(*)::integer INTO trials_expiring_7d
  FROM public.profiles
  WHERE lower(coalesce(subscription_status, '')) = 'trial'
    AND trial_end_date IS NOT NULL
    AND trial_end_date >= now()
    AND trial_end_date < now() + interval '7 days';

  SELECT count(*)::integer INTO ever_trialed
  FROM public.profiles
  WHERE trial_end_date IS NOT NULL
     OR lower(coalesce(subscription_status, '')) = 'trial'
     OR stripe_customer_id IS NOT NULL;

  SELECT count(*)::integer INTO converted_active
  FROM public.profiles WHERE lower(coalesce(subscription_status, '')) = 'active';

  IF ever_trialed > 0 THEN
    conversion_rate := round((converted_active::numeric / ever_trialed::numeric) * 100, 1);
  ELSE
    conversion_rate := 0;
  END IF;

  RETURN jsonb_build_object(
    'total_signups', total_signups,
    'signups_this_week', signups_week,
    'signups_this_month', signups_month,
    'trial_users', trial_users,
    'paying_users', paying_users,
    'past_due_users', past_due_users,
    'canceled_users', canceled_users,
    'monthly_subscribers', monthly_active,
    'annual_subscribers', annual_active,
    'mrr', round(mrr, 2),
    'arr', round(arr, 2),
    'new_paid_this_month', new_paid_month,
    'new_mrr_this_month', round(new_mrr_month, 2),
    'churned_this_month', churned_month,
    'active_trials', active_trials,
    'trials_expiring_7d', trials_expiring_7d,
    'trial_to_paid_conversion_rate', conversion_rate,
    'ever_trialed', ever_trialed,
    'converted_active', converted_active
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_metrics() IS 'Admin dashboard summary: users, revenue, trials. Callable only by is_admin users.';

CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_is_admin boolean;
  result jsonb;
BEGIN
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()), false)
  INTO caller_is_admin;

  IF NOT caller_is_admin THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT coalesce(jsonb_agg(row_data ORDER BY (row_data->>'created_at') DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.user_id,
      'email', p.email,
      'full_name', nullif(trim(coalesce(p.full_name, concat_ws(' ', p.first_name, p.last_name))), ''),
      'subscription_status', p.subscription_status,
      'plan_type', p.plan_type,
      'trial_end_date', p.trial_end_date,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'onboarding_completed', coalesce(p.onboarding_completed, false),
      'last_sign_in_at', u.last_sign_in_at
    ) AS row_data
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.user_id
  ) sub;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_admin_users_list() IS 'Admin dashboard user rows with last_sign_in_at from auth.users. Admin only.';

GRANT EXECUTE ON FUNCTION public.get_admin_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users_list() TO authenticated;
