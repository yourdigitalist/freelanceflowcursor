-- Admin-only RPC: returns simple usage stats (total users, projects, invoices, time entries).
-- Callable only by users with profiles.is_admin = true.

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_projects', (SELECT count(*) FROM public.projects),
    'total_invoices', (SELECT count(*) FROM public.invoices),
    'total_time_entries', (SELECT count(*) FROM public.time_entries),
    'total_clients', (SELECT count(*) FROM public.clients)
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_admin_stats() IS 'Returns usage counts for admin dashboard. Callable only by users with is_admin = true.';
