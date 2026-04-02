-- Schedule sync-users-to-resend Edge Function so Resend contacts/segments stay in sync.
-- Requires: pg_cron and pg_net extensions (enable in Dashboard → Database → Extensions if needed).
-- Before running: add Vault secrets (Dashboard → SQL Editor or Vault):
--   select vault.create_secret('https://mtgocbkjrfpffzjkhmox.supabase.co', 'sync_resend_project_url');
--   select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'sync_resend_service_role_key');

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'sync-users-to-resend-hourly' LIMIT 1;
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;  -- job may not exist or extensions not ready
END $$;

SELECT cron.schedule(
  'sync-users-to-resend-hourly',
  '0 * * * *',  -- every hour at minute 0
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_resend_project_url') || '/functions/v1/sync-users-to-resend',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_resend_service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
