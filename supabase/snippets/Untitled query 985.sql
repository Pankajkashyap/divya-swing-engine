-- 019_setup_pg_cron.sql
-- Purpose: Schedule market-scan and watchlist-evaluate Edge Functions using pg_cron
--
-- Before running this migration:
-- 1. Replace <PROJECT_REF> with your actual Supabase project reference
-- 2. Replace REPLACE_WITH_REAL_CRON_SECRET with your actual CRON_SECRET value
--
-- These jobs are idempotent — the Edge Functions use window-key deduplication
-- so duplicate triggers within the same cadence window are safe.

create extension if not exists pg_net;

-- Set cron secret as a database config parameter
-- Replace REPLACE_WITH_REAL_CRON_SECRET before running this migration.
-- CRON_SECRET is managed via Supabase Edge Function secrets and cron job headers.
-- Do not commit the actual secret value here.

-- Remove existing jobs if re-running this migration
select cron.unschedule(jobname)
from cron.job
where jobname like 'divya-%';

-- =========================
-- market-scan
-- 8:30 AM ET
-- winter: 13:30 UTC
-- summer: 12:30 UTC
-- =========================

select cron.schedule(
  'divya-market-scan-0830-winter',
  '30 13 * * 1-5',
  $$
  select net.http_post(
    url := 'https://tbxvccwbhnrcantntkhy.supabase.co/functions/v1/market-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'divya-market-scan-0830-summer',
  '30 12 * * 1-5',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =========================
-- market-scan
-- 12:30 PM ET
-- winter: 17:30 UTC
-- summer: 16:30 UTC
-- =========================

select cron.schedule(
  'divya-market-scan-1230-winter',
  '30 17 * * 1-5',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'divya-market-scan-1230-summer',
  '30 16 * * 1-5',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =========================
-- market-scan
-- 4:30 PM ET
-- winter: 21:30 UTC
-- summer: 20:30 UTC
-- =========================

select cron.schedule(
  'divya-market-scan-1630-winter',
  '30 21 * * 1-5',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'divya-market-scan-1630-summer',
  '30 20 * * 1-5',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =========================
-- watchlist-evaluate
-- 8:35 AM ET
-- winter: 13:35 UTC
-- summer: 12:35 UTC
-- =========================

select cron.schedule(
  'divya-watchlist-evaluate-0835-winter',
  '35 13 * * 1-5',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/watchlist-evaluate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'divya-watchlist-evaluate-0835-summer',
  '35 12 * * 1-5',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/watchlist-evaluate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =========================
-- watchlist-evaluate
-- 12:35 PM ET
-- winter: 17:35 UTC
-- summer: 16:35 UTC
-- =========================

select cron.schedule(
  'divya-watchlist-evaluate-1235-winter',
  '35 17 * * 1-5',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/watchlist-evaluate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'divya-watchlist-evaluate-1235-summer',
  '35 16 * * 1-5',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/watchlist-evaluate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);