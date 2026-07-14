-- Add `invoiced` billing status (on draft invoice) and sync lifecycle with invoice status.

ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_billing_status_valid;
ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_billing_status_valid
  CHECK (billing_status IN ('unbilled', 'invoiced', 'billed', 'paid', 'not_billable'));

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

  IF NEW.invoice_id IS NULL AND NEW.billing_status IN ('billed', 'paid', 'invoiced') THEN
    RAISE EXCEPTION 'invoiced/billed/paid time entries must be linked to an invoice';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_time_entries_on_invoice_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'paid' AND COALESCE(OLD.status, '') <> 'paid' THEN
    UPDATE public.time_entries
    SET billing_status = 'paid'
    WHERE invoice_id = NEW.id
      AND billing_status IN ('billed', 'invoiced', 'paid', 'unbilled');
  ELSIF COALESCE(OLD.status, '') = 'paid' AND NEW.status <> 'paid' THEN
    IF NEW.status = 'draft' THEN
      UPDATE public.time_entries
      SET billing_status = 'invoiced'
      WHERE invoice_id = NEW.id
        AND billing_status = 'paid';
    ELSE
      UPDATE public.time_entries
      SET billing_status = 'billed'
      WHERE invoice_id = NEW.id
        AND billing_status = 'paid';
    END IF;
  ELSIF NEW.status = 'draft' AND COALESCE(OLD.status, '') <> 'draft' THEN
    UPDATE public.time_entries
    SET billing_status = 'invoiced'
    WHERE invoice_id = NEW.id
      AND billing_status IN ('billed', 'unbilled');
  ELSIF NEW.status IN ('sent', 'overdue', 'reminder_sent')
    AND COALESCE(OLD.status, 'draft') <> NEW.status THEN
    UPDATE public.time_entries
    SET billing_status = 'billed'
    WHERE invoice_id = NEW.id
      AND billing_status IN ('unbilled', 'invoiced');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_time_entries_before_invoice_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.time_entries
  SET invoice_id = NULL,
      billing_status = 'unbilled'
  WHERE invoice_id = OLD.id
    AND billing_status IN ('billed', 'paid', 'invoiced');
  RETURN OLD;
END;
$$;

-- Backfill entries linked to invoices but still showing as unbilled.
UPDATE public.time_entries te
SET billing_status = CASE
  WHEN i.status = 'paid' THEN 'paid'
  WHEN i.status IN ('sent', 'overdue', 'reminder_sent') THEN 'billed'
  ELSE 'invoiced'
END
FROM public.invoices i
WHERE te.invoice_id = i.id
  AND te.billable IS NOT FALSE
  AND te.billing_status = 'unbilled';
