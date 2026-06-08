-- Schedule cleanup-inactive-accounts Edge Function daily.
-- Requires: pg_cron and pg_net extensions.
--
-- Vault secrets (Dashboard -> SQL or Vault):
--   select vault.create_secret('https://mtgocbkjrfpffzjkhmox.supabase.co', 'cleanup_project_url');
--   select vault.create_secret('YOUR_CLEANUP_CRON_KEY', 'cleanup_cron_key');
--
-- Set the same key as Edge Function secret CLEANUP_CRON_KEY.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'cleanup-inactive-accounts-daily' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-inactive-accounts-daily',
  '0 10 * * *',  -- daily at 10:00 UTC (after trial reminders)
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cleanup_project_url') || '/functions/v1/cleanup-inactive-accounts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cleanup_cron_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
