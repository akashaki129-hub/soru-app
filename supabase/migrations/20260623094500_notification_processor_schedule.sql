-- Invoke the durable notification processor every minute.
-- Required Vault secrets are provisioned separately and never committed:
-- soru_project_url, soru_publishable_key, soru_notification_cron_secret.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'soru-process-notifications') THEN
    PERFORM cron.unschedule('soru-process-notifications');
  END IF;
END;
$$;

SELECT cron.schedule(
  'soru-process-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'soru_project_url'
    ) || '/functions/v1/soru-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'soru_publishable_key'
      ),
      'apikey', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'soru_publishable_key'
      ),
      'x-cron-secret', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'soru_notification_cron_secret'
      )
    ),
    body := '{}'::JSONB
  );
  $$
);
