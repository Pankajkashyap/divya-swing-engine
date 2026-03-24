-- 019_setup_pg_cron.sql
-- Purpose: Schedule market-scan, watchlist-evaluate, and trade-monitor Edge Functions using pg_cron
--
-- Before running this migration:
-- 1. Replace <PROJECT_REF> with your actual Supabase project reference
-- 2. Ensure a Vault secret named 'divya_cron_secret' already exists
--
-- Create the Vault secret separately if needed:
-- select vault.create_secret('YOUR_REAL_CRON_SECRET', 'divya_cron_secret');
--
-- These jobs are idempotent — the Edge Functions use window-key deduplication
-- so duplicate triggers within the same cadence window are safe.

create extension if not exists pg_net;
create extension if not exists pg_cron;

DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname LIKE 'divya-%';

    -- =========================
    -- market-scan
    -- 8:30 AM ET
    -- winter: 13:30 UTC
    -- summer: 12:30 UTC
    -- =========================

    PERFORM cron.schedule(
      'divya-market-scan-0830-winter',
      '30 13 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-scan',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    PERFORM cron.schedule(
      'divya-market-scan-0830-summer',
      '30 12 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-scan',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    -- =========================
    -- market-scan
    -- 12:30 PM ET
    -- winter: 17:30 UTC
    -- summer: 16:30 UTC
    -- =========================

    PERFORM cron.schedule(
      'divya-market-scan-1230-winter',
      '30 17 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-scan',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    PERFORM cron.schedule(
      'divya-market-scan-1230-summer',
      '30 16 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-scan',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    -- =========================
    -- market-scan
    -- 4:30 PM ET
    -- winter: 21:30 UTC
    -- summer: 20:30 UTC
    -- =========================

    PERFORM cron.schedule(
      'divya-market-scan-1630-winter',
      '30 21 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-scan',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    PERFORM cron.schedule(
      'divya-market-scan-1630-summer',
      '30 20 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-scan',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    -- =========================
    -- watchlist-evaluate
    -- 8:35 AM ET
    -- winter: 13:35 UTC
    -- summer: 12:35 UTC
    -- =========================

    PERFORM cron.schedule(
      'divya-watchlist-evaluate-0835-winter',
      '35 13 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/watchlist-evaluate',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    PERFORM cron.schedule(
      'divya-watchlist-evaluate-0835-summer',
      '35 12 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/watchlist-evaluate',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    -- =========================
    -- watchlist-evaluate
    -- 12:35 PM ET
    -- winter: 17:35 UTC
    -- summer: 16:35 UTC
    -- =========================

    PERFORM cron.schedule(
      'divya-watchlist-evaluate-1235-winter',
      '35 17 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/watchlist-evaluate',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    PERFORM cron.schedule(
      'divya-watchlist-evaluate-1235-summer',
      '35 16 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/watchlist-evaluate',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    -- =========================
    -- trade-monitor
    -- 8:30 AM ET
    -- winter: 13:30 UTC
    -- summer: 12:30 UTC
    -- =========================

    PERFORM cron.schedule(
      'divya-trade-monitor-0830-winter',
      '30 13 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/trade-monitor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    PERFORM cron.schedule(
      'divya-trade-monitor-0830-summer',
      '30 12 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/trade-monitor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    -- =========================
    -- trade-monitor
    -- 12:30 PM ET
    -- winter: 17:30 UTC
    -- summer: 16:30 UTC
    -- =========================

    PERFORM cron.schedule(
      'divya-trade-monitor-1230-winter',
      '30 17 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/trade-monitor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    PERFORM cron.schedule(
      'divya-trade-monitor-1230-summer',
      '30 16 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/trade-monitor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    -- =========================
    -- trade-monitor
    -- 4:30 PM ET
    -- winter: 21:30 UTC
    -- summer: 20:30 UTC
    -- =========================

    PERFORM cron.schedule(
      'divya-trade-monitor-1630-winter',
      '30 21 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/trade-monitor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    PERFORM cron.schedule(
      'divya-trade-monitor-1630-summer',
      '30 20 * * 1-5',
      $cron$
      select net.http_post(
        url := 'https://<PROJECT_REF>.supabase.co/functions/v1/trade-monitor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'divya_cron_secret'
              limit 1
            )
          )
        ),
        body := '{}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;