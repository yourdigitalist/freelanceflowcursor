-- Derive monthly/yearly invoice sequence from existing invoices so switching formats
-- does not continue the old lifetime counter (e.g. 020/08/2026 instead of 03/08/2026).

CREATE OR REPLACE FUNCTION public.next_invoice_number(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_row public.profiles%ROWTYPE;
  current_year int := EXTRACT(YEAR FROM now())::int;
  current_month int := EXTRACT(MONTH FROM now())::int;
  start_num int;
  padding int;
  next_num int;
  prefix text;
  include_year boolean;
  reset_yearly boolean;
  reset_mode text;
  fmt text;
  formatted text;
  attempts int := 0;
  match_pattern text;
  max_existing int;
BEGIN
  SELECT * INTO profile_row
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF profile_row.user_id IS NULL THEN
    RETURN 'INV-' || current_year::text || right((EXTRACT(EPOCH FROM now())::bigint)::text, 6);
  END IF;

  start_num := GREATEST(1, COALESCE(profile_row.invoice_number_start, 1));
  padding := LEAST(6, GREATEST(1, COALESCE(profile_row.invoice_number_padding, 4)));
  next_num := COALESCE(profile_row.invoice_number_next, start_num);
  prefix := COALESCE(profile_row.invoice_prefix, 'INV');
  prefix := trim(prefix);
  include_year := COALESCE(profile_row.invoice_include_year, true);
  reset_yearly := COALESCE(profile_row.invoice_number_reset_yearly, true);

  fmt := NULLIF(trim(COALESCE(profile_row.invoice_number_format, '')), '');
  reset_mode := NULLIF(trim(COALESCE(profile_row.invoice_number_reset, '')), '');

  IF fmt IS NULL THEN
    fmt := '{{prefix}}' || CASE WHEN include_year THEN '{{year}}' ELSE '' END || '{{number}}';
    reset_mode := CASE WHEN reset_yearly THEN 'yearly' ELSE 'never' END;
  END IF;

  IF reset_mode IS NULL OR reset_mode NOT IN ('never', 'yearly', 'monthly') THEN
    reset_mode := CASE WHEN reset_yearly THEN 'yearly' ELSE 'never' END;
  END IF;

  -- Build a regex for this period so we can read the highest used {{number}}.
  match_pattern := replace(fmt, '{{prefix}}', regexp_replace(COALESCE(prefix, ''), '([\\.^$|?*+(){}\[\]\\])', '\\\1', 'g'));
  match_pattern := replace(match_pattern, '{{year}}', current_year::text);
  match_pattern := replace(match_pattern, '{{yy}}', right(current_year::text, 2));
  match_pattern := replace(match_pattern, '{{month}}', lpad(current_month::text, 2, '0'));
  match_pattern := '^' || replace(match_pattern, '{{number}}', '([0-9]+)') || '$';

  IF reset_mode IN ('monthly', 'yearly') AND position('{{number}}' in fmt) > 0 THEN
    SELECT MAX((regexp_match(i.invoice_number, match_pattern))[1]::int)
    INTO max_existing
    FROM public.invoices i
    WHERE i.user_id = p_user_id
      AND i.invoice_number ~ match_pattern;

    next_num := GREATEST(start_num, COALESCE(max_existing, 0) + 1);
  ELSIF reset_mode = 'monthly' THEN
    IF profile_row.invoice_number_last_year IS NULL
       OR profile_row.invoice_number_last_year < current_year
       OR profile_row.invoice_number_last_month IS NULL
       OR profile_row.invoice_number_last_month <> current_month THEN
      next_num := start_num;
    ELSIF next_num < start_num THEN
      next_num := start_num;
    END IF;
  ELSIF reset_mode = 'yearly' THEN
    IF profile_row.invoice_number_last_year IS NULL
       OR profile_row.invoice_number_last_year < current_year THEN
      next_num := start_num;
    ELSIF next_num < start_num THEN
      next_num := start_num;
    END IF;
  ELSIF next_num < start_num THEN
    next_num := start_num;
  END IF;

  LOOP
    formatted := fmt;
    formatted := replace(formatted, '{{prefix}}', COALESCE(prefix, ''));
    formatted := replace(formatted, '{{year}}', current_year::text);
    formatted := replace(formatted, '{{yy}}', right(current_year::text, 2));
    formatted := replace(formatted, '{{month}}', lpad(current_month::text, 2, '0'));
    formatted := replace(formatted, '{{number}}', lpad(next_num::text, padding, '0'));

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.invoices
      WHERE user_id = p_user_id
        AND invoice_number = formatted
    );

    next_num := next_num + 1;
    attempts := attempts + 1;
    IF attempts > 1000 THEN
      formatted := COALESCE(NULLIF(prefix, ''), 'INV') || '-' || current_year::text
        || right((EXTRACT(EPOCH FROM now())::bigint)::text, 6);
      EXIT;
    END IF;
  END LOOP;

  UPDATE public.profiles
  SET invoice_number_next = next_num + 1,
      invoice_number_last_year = current_year,
      invoice_number_last_month = current_month
  WHERE user_id = p_user_id;

  RETURN formatted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid) TO authenticated;
