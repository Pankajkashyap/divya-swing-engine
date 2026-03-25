-- 020_add_workflow_preferences.sql
-- Purpose: Add workflow preference columns to user_settings

-- scan_schedule: controls when watchlist-evaluate runs
-- Values: 'evening_only' | 'three_times_daily'
-- Default: 'evening_only' — recommended for swing traders reviewing signals at night

alter table public.user_settings
  add column if not exists scan_schedule text not null default 'evening_only';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_settings_scan_schedule_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_scan_schedule_check
      check (scan_schedule in ('evening_only', 'three_times_daily'));
  end if;
end $$;

-- buy_signal_expiry_days: how many trading days a buy signal stays active
-- Values: 1 | 2 | 3
-- Default: 1 — signal expires end of next trading day

alter table public.user_settings
  add column if not exists buy_signal_expiry_days integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_settings_buy_signal_expiry_days_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_buy_signal_expiry_days_check
      check (buy_signal_expiry_days in (1, 2, 3));
  end if;
end $$;

-- morning_trade_monitor_enabled: whether trade-monitor runs at the 8:30 AM slot
-- Default: true — catch stop hits at market open

alter table public.user_settings
  add column if not exists morning_trade_monitor_enabled boolean not null default true;

-- Backfill existing row with defaults
update public.user_settings
set
  scan_schedule = coalesce(scan_schedule, 'evening_only'),
  buy_signal_expiry_days = coalesce(buy_signal_expiry_days, 1),
  morning_trade_monitor_enabled = coalesce(morning_trade_monitor_enabled, true)
where
  scan_schedule is null
  or buy_signal_expiry_days is null
  or morning_trade_monitor_enabled is null;