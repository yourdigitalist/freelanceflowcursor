-- Grandfather existing users: never enforce billing (card, lock screen, cleanup, trial emails).
-- New signups after this migration keep is_lifetime = false (default).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_lifetime boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_lifetime IS
  'When true, user bypasses all billing enforcement. Set at cutover for existing users; not writable by end users.';

-- Grandfather every profile that exists at cutover.
UPDATE public.profiles
SET is_lifetime = true
WHERE is_lifetime = false;

CREATE OR REPLACE FUNCTION public.protect_profile_is_lifetime()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_lifetime IS TRUE AND COALESCE(auth.role(), '') <> 'service_role' THEN
      NEW.is_lifetime := false;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.is_lifetime IS DISTINCT FROM OLD.is_lifetime THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
      NEW.is_lifetime := OLD.is_lifetime;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_is_lifetime_trigger ON public.profiles;
CREATE TRIGGER protect_profile_is_lifetime_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_is_lifetime();
