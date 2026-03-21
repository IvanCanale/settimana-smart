-- supabase/migrations/005_pg_cron_reminders.sql
--
-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.
-- Run this migration in Supabase SQL Editor AFTER:
--   1. Enabling pg_cron and pg_net extensions via Dashboard -> Database -> Extensions
--   2. Deploying the send-reminders Edge Function:
--      supabase functions deploy send-reminders --project-ref <YOUR_PROJECT_REF>
--
-- To find YOUR_PROJECT_REF: Supabase Dashboard -> Settings -> General -> Reference ID
-- To find YOUR_SERVICE_ROLE_KEY: Supabase Dashboard -> Settings -> API -> service_role key

-- Enable required extensions (idempotent — safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Evening reminder: runs every day at 17:00 UTC (18:00 CET / 19:00 CEST)
-- The Edge Function checks each user's timezone to determine whether it is
-- actually the "evening before their shopping day" — UTC scheduling is just
-- the trigger window; the real filtering happens inside the function.
SELECT cron.schedule(
  'send-evening-reminder',
  '0 17 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'Content-Type',  'application/json'
      ),
      body    := '{"type": "evening"}'::jsonb
    );
  $$
);

-- Day-of reminder: runs every 30 minutes between 06:00–20:00 UTC.
-- This window covers notification times from 06:00 to 20:30 UTC, which maps to
-- approximately 07:00–21:30 CET — enough to reach all Italian users regardless
-- of their configured notification time.
-- The Edge Function verifies each user's local time is within 30 min of their
-- configured shoppingNotificationTime before sending.
SELECT cron.schedule(
  'send-day-of-reminder',
  '*/30 6-20 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'Content-Type',  'application/json'
      ),
      body    := '{"type": "day_of"}'::jsonb
    );
  $$
);
