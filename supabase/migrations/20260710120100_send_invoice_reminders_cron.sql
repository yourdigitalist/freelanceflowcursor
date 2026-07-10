-- Schedule send-invoice-reminders Edge Function daily (client payment reminders).
-- Reuses the same Vault secrets as send-deadline-notifications:
--   notifications_project_url
--   notifications_cron_key
-- Set NOTIFICATIONS_CRON_KEY on the send-invoice-reminders Edge Function.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'send-invoice-reminders-daily' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'send-invoice-reminders-daily',
  '30 8 * * *',  -- daily at 08:30 UTC (after freelancer deadline notifications)
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notifications_project_url') || '/functions/v1/send-invoice-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notifications_cron_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
