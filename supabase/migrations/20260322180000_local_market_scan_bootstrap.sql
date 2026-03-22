-- Local bootstrap migration for market-scan testing only

create extension if not exists pgcrypto;

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  portfolio_value numeric not null default 100000,
  timezone text not null default 'America/Toronto',
  email_notifications_enabled boolean not null default true,
  digest_email_enabled boolean not null default true,
  urgent_alerts_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  snapshot_date date not null,
  market_phase text not null,
  max_long_exposure_pct numeric,
  source text not null default 'manual',
  last_market_scan_at timestamptz,
  created_at timestamptz not null default now(),
  unique (snapshot_date)
);

create table if not exists public.scan_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_type text not null,
  entity_type text,
  entity_id text,
  ticker text,
  window_key text not null,
  status text not null,
  message text,
  changes_json jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_scan_logs_job_window
  on public.scan_logs (job_type, window_key);

create index if not exists idx_scan_logs_job_window_ticker
  on public.scan_logs (job_type, window_key, ticker);

create index if not exists idx_scan_logs_user_started_at
  on public.scan_logs (user_id, started_at desc);

insert into public.user_settings (
  user_id,
  portfolio_value,
  timezone,
  email_notifications_enabled,
  digest_email_enabled,
  urgent_alerts_enabled
)
values (
  '89b2a201-04fb-4c5e-8d42-bdb0c89c42ff',
  100000,
  'America/Toronto',
  true,
  true,
  true
)
on conflict (user_id) do nothing;