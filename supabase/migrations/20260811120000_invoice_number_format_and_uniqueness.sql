-- Invoice number format templates, monthly reset, due-days default, and unique invoice numbers per user

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invoice_number_format text,
  ADD COLUMN IF NOT EXISTS invoice_number_reset text DEFAULT 'yearly',
  ADD COLUMN IF NOT EXISTS invoice_number_last_month integer,
  ADD COLUMN IF NOT EXISTS invoice_due_days integer DEFAULT 30;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_invoice_number_reset_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_invoice_number_reset_check
      CHECK (invoice_number_reset IS NULL OR invoice_number_reset IN ('never', 'yearly', 'monthly'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.invoice_number_format IS
  'Template for invoice numbers. Tags: {{number}}, {{month}}, {{year}}, {{yy}}, {{prefix}}';
COMMENT ON COLUMN public.profiles.invoice_number_reset IS
  'When the sequence restarts: never, yearly, or monthly';
COMMENT ON COLUMN public.profiles.invoice_due_days IS
  'Default days after issue date for due date on new invoices';

-- Resolve any existing duplicates before adding uniqueness
WITH ranked AS (
  SELECT
    id,
    user_id,
    invoice_number,
    ROW_NUMBER() OVER (PARTITION BY user_id, invoice_number ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.invoices
)
UPDATE public.invoices i
SET invoice_number = i.invoice_number || '-dup-' || left(replace(i.id::text, '-', ''), 8)
FROM ranked r
WHERE i.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_id_invoice_number_uidx
  ON public.invoices (user_id, invoice_number);

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
  prefix := COALESCE(NULLIF(trim(profile_row.invoice_prefix), ''), 'INV');
  include_year := COALESCE(profile_row.invoice_include_year, true);
  reset_yearly := COALESCE(profile_row.invoice_number_reset_yearly, true);

  fmt := NULLIF(trim(COALESCE(profile_row.invoice_number_format, '')), '');
  reset_mode := NULLIF(trim(COALESCE(profile_row.invoice_number_reset, '')), '');

  IF fmt IS NULL THEN
    -- Legacy: prefix + optional year + padded number
    fmt := '{{prefix}}' || CASE WHEN include_year THEN '{{year}}' ELSE '' END || '{{number}}';
    reset_mode := CASE WHEN reset_yearly THEN 'yearly' ELSE 'never' END;
  END IF;

  IF reset_mode IS NULL OR reset_mode NOT IN ('never', 'yearly', 'monthly') THEN
    reset_mode := CASE WHEN reset_yearly THEN 'yearly' ELSE 'never' END;
  END IF;

  IF reset_mode = 'monthly' THEN
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
    formatted := replace(formatted, '{{prefix}}', prefix);
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
      formatted := prefix || '-' || current_year::text || right((EXTRACT(EPOCH FROM now())::bigint)::text, 6);
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
