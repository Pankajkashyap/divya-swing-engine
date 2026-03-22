-- Local bootstrap migration for watchlist-evaluate testing only

create extension if not exists pgcrypto;

-- =========================
-- WATCHLIST
-- =========================
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ticker text not null,
  company_name text,
  setup_type text,
  setup_grade text,

  trend_template_pass boolean,
  volume_dry_up_pass boolean,
  rs_line_confirmed boolean,
  base_pattern_valid boolean,
  entry_near_pivot boolean,
  volume_breakout_confirmed boolean,
  liquidity_pass boolean,

  earnings_within_2_weeks boolean,
  binary_event_risk boolean,

  eps_growth_pct numeric,
  eps_accelerating boolean,
  revenue_growth_pct numeric,
  acc_dist_rating text,
  industry_group_rank integer,

  pivot_price numeric,
  entry_zone_low numeric,
  entry_zone_high numeric,
  stop_price numeric,
  target_1_price numeric,
  target_2_price numeric,

  status text,
  action_status text,

  signal_state text not null default 'new',
  consecutive_fail_count integer not null default 0,
  data_status text not null default 'stale',
  flagged_for_review boolean not null default false,
  last_evaluated_at timestamptz,
  last_price_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_watchlist_user_created_at
  on public.watchlist (user_id, created_at desc);

create index if not exists idx_watchlist_signal_state
  on public.watchlist (signal_state);

-- =========================
-- SETUP EVALUATIONS
-- =========================
create table if not exists public.setup_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  watchlist_id uuid not null,
  evaluation_date date not null,

  market_phase_pass boolean not null,
  trend_template_pass boolean not null,
  liquidity_pass boolean not null,
  base_pattern_valid boolean not null,
  volume_pattern_valid boolean not null,
  rs_line_confirmed boolean not null,
  entry_near_pivot_pass boolean not null,
  volume_breakout_pass boolean not null,

  earnings_risk_flag boolean not null,
  binary_event_flag boolean not null,

  setup_grade text,
  score_total integer not null,
  verdict text not null,
  fail_reason text,
  notes text,

  created_at timestamptz not null default now()
);

create index if not exists idx_setup_evaluations_user_created_at
  on public.setup_evaluations (user_id, created_at desc);

create index if not exists idx_setup_evaluations_watchlist_id
  on public.setup_evaluations (watchlist_id);

-- =========================
-- TRADE PLANS
-- =========================
create table if not exists public.trade_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  watchlist_id uuid,
  source_watchlist_id uuid,
  generated_by text not null,
  plan_date date not null,
  side text not null,

  portfolio_value numeric not null,
  risk_pct numeric not null,
  dollar_risk numeric not null,
  entry_price numeric not null,
  stop_price numeric not null,
  risk_per_share numeric not null,
  planned_shares integer not null,
  position_value numeric not null,
  final_shares integer not null,
  final_position_value numeric not null,
  expected_rr numeric not null,
  approval_status text not null,
  blocked_reason text,

  created_at timestamptz not null default now()
);

create index if not exists idx_trade_plans_user_created_at
  on public.trade_plans (user_id, created_at desc);

create index if not exists idx_trade_plans_watchlist_id
  on public.trade_plans (watchlist_id);

-- =========================
-- PENDING ACTIONS
-- =========================
create table if not exists public.pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ticker text not null,
  action_type text not null,
  state text not null default 'awaiting_confirmation',
  urgency text not null,
  title text not null,
  message text,

  trade_id uuid,
  watchlist_id uuid,
  trade_plan_id uuid,

  payload_json jsonb not null default '{}'::jsonb,

  expires_at timestamptz,
  snoozed_until timestamptz,
  resolved_at timestamptz,

  created_at timestamptz not null default now()
);

create unique index if not exists idx_pending_actions_user_ticker_type_open
  on public.pending_actions (user_id, ticker, action_type, state);

create index if not exists idx_pending_actions_user_state_urgency
  on public.pending_actions (user_id, state, urgency);

create index if not exists idx_pending_actions_watchlist_id
  on public.pending_actions (watchlist_id);

create index if not exists idx_pending_actions_trade_plan_id
  on public.pending_actions (trade_plan_id);

-- =========================
-- NOTIFICATIONS
-- =========================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ticker text not null,
  trigger_type text not null,
  trigger_state text not null,
  dedupe_key text not null unique,

  trade_id uuid,
  pending_action_id uuid,

  sent_at timestamptz not null,
  cooldown_until timestamptz,
  resolved_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_trigger_sent_at
  on public.notifications (user_id, trigger_type, sent_at desc);

create index if not exists idx_notifications_dedupe_key
  on public.notifications (dedupe_key);

-- =========================
-- OPTIONAL FOREIGN KEYS
-- =========================
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'setup_evaluations_watchlist_id_fkey'
  ) then
    alter table public.setup_evaluations
      add constraint setup_evaluations_watchlist_id_fkey
      foreign key (watchlist_id) references public.watchlist(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trade_plans_watchlist_id_fkey'
  ) then
    alter table public.trade_plans
      add constraint trade_plans_watchlist_id_fkey
      foreign key (watchlist_id) references public.watchlist(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trade_plans_source_watchlist_id_fkey'
  ) then
    alter table public.trade_plans
      add constraint trade_plans_source_watchlist_id_fkey
      foreign key (source_watchlist_id) references public.watchlist(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pending_actions_watchlist_id_fkey'
  ) then
    alter table public.pending_actions
      add constraint pending_actions_watchlist_id_fkey
      foreign key (watchlist_id) references public.watchlist(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pending_actions_trade_plan_id_fkey'
  ) then
    alter table public.pending_actions
      add constraint pending_actions_trade_plan_id_fkey
      foreign key (trade_plan_id) references public.trade_plans(id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_pending_action_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_pending_action_id_fkey
      foreign key (pending_action_id) references public.pending_actions(id);
  end if;
end $$;

-- =========================
-- SEED ONE TEST WATCHLIST ROW
-- =========================
insert into public.watchlist (
  user_id,
  ticker,
  company_name,
  setup_type,
  setup_grade,
  trend_template_pass,
  volume_dry_up_pass,
  rs_line_confirmed,
  base_pattern_valid,
  entry_near_pivot,
  volume_breakout_confirmed,
  liquidity_pass,
  earnings_within_2_weeks,
  binary_event_risk,
  eps_growth_pct,
  eps_accelerating,
  revenue_growth_pct,
  acc_dist_rating,
  industry_group_rank,
  pivot_price,
  entry_zone_low,
  entry_zone_high,
  stop_price,
  target_1_price,
  target_2_price,
  status,
  action_status,
  signal_state,
  consecutive_fail_count,
  data_status,
  flagged_for_review
)
values (
  '89b2a201-04fb-4c5e-8d42-bdb0c89c42ff',
  'NVDA',
  'NVIDIA Corp',
  'breakout',
  'A',
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  false,
  false,
  35,
  true,
  30,
  'B',
  12,
  650,
  648,
  652,
  630,
  690,
  720,
  'watchlist',
  'watchlist',
  'new',
  0,
  'fresh',
  false
)
on conflict do nothing;