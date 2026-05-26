-- PostgREST upsert needs a named UNIQUE constraint on (user_id, event_key).
-- Partial unique index alone is not enough for onConflict; inserts use duplicate handling in app code.
DROP INDEX IF EXISTS public.notifications_user_event_key_unique_idx;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_event_key_unique;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_event_key_unique UNIQUE (user_id, event_key);
