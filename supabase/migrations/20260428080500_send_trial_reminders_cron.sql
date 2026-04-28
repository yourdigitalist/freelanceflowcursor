-- Schedule send-trial-reminders Edge Function to run daily.
-- Requires: pg_cron and pg_net extensions (enable in Dashboard -> Database -> Extensions if needed).
-- Before running: add Vault secrets (Dashboard -> SQL Editor or Vault):
--   select vault.create_secret('https://mtgocbkjrfpffzjkhmox.supabase.co', 'trial_reminders_project_url');
--   select vault.create_secret('YOUR_TRIAL_REMINDERS_CRON_KEY', 'trial_reminders_cron_key');

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'send-trial-reminders-daily' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;  -- job may not exist or extensions not ready
END $$;

SELECT cron.schedule(
  'send-trial-reminders-daily',
  '0 9 * * *',  -- daily at 09:00 UTC
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'trial_reminders_project_url') || '/functions/v1/send-trial-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'trial_reminders_cron_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
