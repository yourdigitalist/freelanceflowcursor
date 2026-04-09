-- Add deterministic event keys for notifications so scheduled jobs can upsert
-- without creating duplicates on repeated runs.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event_key_unique_idx
  ON public.notifications(user_id, event_key)
  WHERE event_key IS NOT NULL;
