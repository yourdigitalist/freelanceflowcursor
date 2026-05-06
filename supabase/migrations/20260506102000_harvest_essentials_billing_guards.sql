-- Harvest-essentials: billing invariants, atomic invoice numbering, and invoice->time links

-- 1) Atomic invoice number generation (row lock on profiles)
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_row public.profiles%ROWTYPE;
  current_year int := EXTRACT(YEAR FROM now())::int;
  start_num int;
  padding int;
  next_num int;
  prefix text;
  include_year boolean;
  reset_yearly boolean;
  formatted text;
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
  reset_yearly := COALESCE(profile_row.invoice_number_reset_yearly, true);
  next_num := COALESCE(profile_row.invoice_number_next, start_num);

  IF reset_yearly AND (profile_row.invoice_number_last_year IS NULL OR profile_row.invoice_number_last_year < current_year) THEN
    next_num := start_num;
  ELSIF next_num < start_num THEN
    next_num := start_num;
  END IF;

  prefix := NULLIF(trim(COALESCE(profile_row.invoice_prefix, 'INV')), '');
  IF prefix IS NULL THEN
    prefix := 'INV';
  END IF;
  include_year := COALESCE(profile_row.invoice_include_year, true);
  formatted := prefix || CASE WHEN include_year THEN current_year::text ELSE '' END || lpad(next_num::text, padding, '0');

  UPDATE public.profiles
  SET invoice_number_next = next_num + 1,
      invoice_number_last_year = current_year
  WHERE user_id = p_user_id;

  RETURN formatted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid) TO authenticated;

-- 2) Explicit invoice<->time entry audit links
CREATE TABLE IF NOT EXISTS public.invoice_time_entry_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_item_id uuid NULL REFERENCES public.invoice_items(id) ON DELETE SET NULL,
  time_entry_id uuid NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, time_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_time_entry_links_invoice_id ON public.invoice_time_entry_links(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_time_entry_links_time_entry_id ON public.invoice_time_entry_links(time_entry_id);

ALTER TABLE public.invoice_time_entry_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own invoice time links" ON public.invoice_time_entry_links;
CREATE POLICY "Users can view own invoice time links"
ON public.invoice_time_entry_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_time_entry_links.invoice_id
      AND i.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert own invoice time links" ON public.invoice_time_entry_links;
CREATE POLICY "Users can insert own invoice time links"
ON public.invoice_time_entry_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_time_entry_links.invoice_id
      AND i.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete own invoice time links" ON public.invoice_time_entry_links;
CREATE POLICY "Users can delete own invoice time links"
ON public.invoice_time_entry_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_time_entry_links.invoice_id
      AND i.user_id = auth.uid()
  )
);

-- 3) Billing-state invariants on time_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'time_entries_billing_status_valid'
  ) THEN
    ALTER TABLE public.time_entries
      ADD CONSTRAINT time_entries_billing_status_valid
      CHECK (billing_status IN ('unbilled', 'billed', 'paid', 'not_billable'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_time_entry_billing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.billable IS FALSE THEN
    NEW.billing_status := 'not_billable';
    NEW.invoice_id := NULL;
  ELSE
    IF NEW.billing_status IS NULL OR NEW.billing_status = 'not_billable' THEN
      NEW.billing_status := 'unbilled';
    END IF;
  END IF;

  IF NEW.invoice_id IS NULL AND NEW.billing_status IN ('billed', 'paid') THEN
    RAISE EXCEPTION 'billed/paid time entries must be linked to an invoice';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_time_entry_billing_trigger ON public.time_entries;
CREATE TRIGGER normalize_time_entry_billing_trigger
BEFORE INSERT OR UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.normalize_time_entry_billing();

-- 4) Keep time_entries status in sync with invoice lifecycle
CREATE OR REPLACE FUNCTION public.sync_time_entries_on_invoice_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'paid' AND COALESCE(OLD.status, '') <> 'paid' THEN
    UPDATE public.time_entries
    SET billing_status = 'paid'
    WHERE invoice_id = NEW.id
      AND billing_status IN ('billed', 'paid');
  ELSIF COALESCE(OLD.status, '') = 'paid' AND NEW.status <> 'paid' THEN
    UPDATE public.time_entries
    SET billing_status = 'billed'
    WHERE invoice_id = NEW.id
      AND billing_status = 'paid';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_time_entries_on_invoice_status_trigger ON public.invoices;
CREATE TRIGGER sync_time_entries_on_invoice_status_trigger
AFTER UPDATE OF status ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_time_entries_on_invoice_status();

CREATE OR REPLACE FUNCTION public.release_time_entries_before_invoice_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.time_entries
  SET invoice_id = NULL,
      billing_status = 'unbilled'
  WHERE invoice_id = OLD.id
    AND billing_status IN ('billed', 'paid');
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS release_time_entries_before_invoice_delete_trigger ON public.invoices;
CREATE TRIGGER release_time_entries_before_invoice_delete_trigger
BEFORE DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.release_time_entries_before_invoice_delete();
