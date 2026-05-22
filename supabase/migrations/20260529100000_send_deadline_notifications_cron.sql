-- Schedule send-deadline-notifications Edge Function daily (in-app + email reminders).
-- Requires: pg_cron and pg_net (Dashboard -> Database -> Extensions).
--
-- Vault secrets (value first, name second in vault.create_secret):
--   select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'notifications_project_url');
--   select vault.create_secret('YOUR_NOTIFICATIONS_CRON_KEY', 'notifications_cron_key');
--
-- Set the same key as Edge Function secret NOTIFICATIONS_CRON_KEY (Dashboard -> Edge Functions -> Secrets).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'send-deadline-notifications-daily' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'send-deadline-notifications-daily',
  '0 8 * * *',  -- daily at 08:00 UTC
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notifications_project_url') || '/functions/v1/send-deadline-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notifications_cron_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
