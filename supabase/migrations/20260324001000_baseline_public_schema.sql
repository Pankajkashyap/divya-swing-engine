create extension if not exists pgcrypto;

create table if not exists public.execution_log (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  trade_id uuid,
  pending_action_id uuid,
  execution_type text not null,
  ticker text not null,
  quantity integer,
  price numeric,
  notes text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.market_snapshots (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  snapshot_date date not null,
  market_phase text not null,
  spx_distribution_days integer default 0 not null,
  ndx_distribution_days integer default 0 not null,
  ftd_active boolean default false not null,
  ftd_date date,
  rally_attempt_day integer,
  indexes_above_50dma boolean,
  indexes_above_150dma boolean,
  indexes_above_200dma boolean,
  leaders_above_50dma_pct numeric,
  new_highs_count integer,
  new_lows_count integer,
  breakout_success_rate_pct numeric,
  ad_line_direction text,
  max_long_exposure_pct numeric,
  notes text,
  user_id uuid not null,
  source text default 'manual' not null,
  last_market_scan_at timestamp with time zone,
  constraint chk_ad_line_direction check (
    ad_line_direction is null
    or ad_line_direction = any (array['up', 'flat', 'down'])
  ),
  constraint chk_market_phase check (
    market_phase = any (array['confirmed_uptrend', 'under_pressure', 'rally_attempt', 'correction', 'bear'])
  ),
  constraint market_snapshots_source_check check (
    source = any (array['manual', 'automation'])
  )
);

create table if not exists public.notifications (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  ticker text,
  trade_id uuid,
  pending_action_id uuid,
  trigger_type text not null,
  trigger_state text not null,
  dedupe_key text not null,
  sent_at timestamp with time zone default now() not null,
  cooldown_until timestamp with time zone,
  resolved_at timestamp with time zone
);

create table if not exists public.pending_actions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  ticker text not null,
  trade_id uuid,
  watchlist_id uuid,
  trade_plan_id uuid,
  action_type text not null,
  state text not null,
  urgency text not null,
  title text not null,
  message text,
  payload_json jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  resolved_at timestamp with time zone,
  expires_at timestamp with time zone,
  snoozed_until timestamp with time zone,
  constraint pending_actions_action_type_check check (
    action_type = any (array['buy_signal', 'stop_alert', 'target_alert', 'watchlist_review', 'manual_reconciliation'])
  ),
  constraint pending_actions_state_check check (
    state = any (array['awaiting_confirmation', 'snoozed', 'dismissed', 'executed', 'expired'])
  ),
  constraint pending_actions_urgency_check check (
    urgency = any (array['urgent', 'normal', 'low'])
  )
);

create table if not exists public.rule_results (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  setup_evaluation_id uuid not null,
  rule_code text not null,
  rule_name text not null,
  passed boolean,
  actual_value_text text,
  actual_value_numeric numeric,
  notes text,
  user_id uuid not null
);

create table if not exists public.scan_logs (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  job_type text not null,
  entity_type text,
  entity_id uuid,
  ticker text,
  window_key text not null,
  status text not null,
  message text,
  changes_json jsonb default '{}'::jsonb not null,
  started_at timestamp with time zone default now() not null,
  finished_at timestamp with time zone
);

create table if not exists public.setup_evaluations (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  watchlist_id uuid not null,
  evaluation_date date not null,
  market_phase_pass boolean,
  trend_template_pass boolean,
  liquidity_pass boolean,
  base_pattern_valid boolean,
  volume_pattern_valid boolean,
  rs_line_confirmed boolean,
  entry_near_pivot_pass boolean,
  volume_breakout_pass boolean,
  earnings_risk_flag boolean default false not null,
  binary_event_flag boolean default false not null,
  rr_pass boolean,
  rr_ratio numeric,
  setup_grade text,
  score_total numeric,
  verdict text,
  fail_reason text,
  notes text,
  user_id uuid not null,
  constraint chk_setup_evaluations_grade check (
    setup_grade is null
    or setup_grade = any (array['A+', 'A', 'B', 'C'])
  ),
  constraint chk_setup_evaluations_verdict check (
    verdict is null
    or verdict = any (array['pass', 'watch', 'fail'])
  )
);

create table if not exists public.trade_plans (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  watchlist_id uuid not null,
  setup_evaluation_id uuid,
  plan_date date not null,
  side text default 'long' not null,
  portfolio_value numeric,
  risk_pct numeric,
  dollar_risk numeric,
  entry_price numeric not null,
  stop_price numeric not null,
  risk_per_share numeric,
  planned_shares integer,
  position_value numeric,
  position_cap_pct numeric default 25 not null,
  adjusted_shares integer,
  target_1_price numeric,
  target_2_price numeric,
  expected_rr numeric,
  earnings_size_adjustment_pct numeric,
  correlation_adjustment_pct numeric,
  final_shares integer,
  final_position_value numeric,
  approval_status text default 'draft' not null,
  blocked_reason text,
  user_id uuid not null,
  source_watchlist_id uuid,
  generated_by text default 'manual' not null,
  constraint chk_trade_plans_approval_status check (
    approval_status = any (array['draft', 'approved', 'blocked', 'executed'])
  ),
  constraint chk_trade_plans_side check (
    side = any (array['long', 'short'])
  ),
  constraint trade_plans_generated_by_check check (
    generated_by = any (array['manual', 'automation'])
  )
);

create table if not exists public.trades (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  trade_plan_id uuid,
  ticker text not null,
  side text default 'long' not null,
  status text default 'open' not null,
  entry_date date,
  entry_price_actual numeric,
  shares_entered integer,
  stop_price_initial numeric,
  stop_price_current numeric,
  target_1_price numeric,
  target_2_price numeric,
  trim_1_taken boolean default false not null,
  trim_1_date date,
  trim_1_price numeric,
  trim_2_taken boolean default false not null,
  trim_2_date date,
  trim_2_price numeric,
  exit_date date,
  exit_price_actual numeric,
  shares_exited integer default 0 not null,
  pnl_dollar numeric,
  pnl_pct numeric,
  r_multiple numeric,
  exit_reason text,
  thesis_intact boolean default true not null,
  notes text,
  user_id uuid not null,
  trade_state text default 'open' not null,
  last_monitored_at timestamp with time zone,
  last_stop_alert_at timestamp with time zone,
  last_target_1_alert_at timestamp with time zone,
  last_target_2_alert_at timestamp with time zone,
  constraint chk_trades_side check (
    side = any (array['long', 'short'])
  ),
  constraint chk_trades_status check (
    status = any (array['open', 'partial', 'closed', 'cancelled'])
  ),
  constraint trades_shares_exited_check check (shares_exited >= 0),
  constraint trades_trade_state_check check (
    trade_state = any (array['open', 'partial', 'closed'])
  )
);

create table if not exists public.user_settings (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  portfolio_value numeric default 100000 not null,
  timezone text default 'America/Toronto' not null,
  email_notifications_enabled boolean default true not null,
  digest_email_enabled boolean default true not null,
  urgent_alerts_enabled boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  notification_email text
);

create table if not exists public.watchlist (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  ticker text not null,
  company_name text,
  sector text,
  industry text,
  setup_type text not null,
  setup_score numeric,
  trend_score numeric,
  volume_score numeric,
  relative_strength numeric,
  earnings_date date,
  catalyst text,
  risk_level text,
  position_size_pct numeric,
  status text default 'watchlist' not null,
  notes text,
  market_snapshot_id uuid,
  base_pattern text,
  setup_grade text,
  trend_template_pass boolean,
  rs_strength_level text,
  volume_dry_up_pass boolean,
  pivot_price numeric,
  entry_zone_low numeric,
  entry_zone_high numeric,
  stop_price numeric,
  target_1_price numeric,
  target_2_price numeric,
  rr_ratio numeric,
  earnings_within_2_weeks boolean default false not null,
  binary_event_risk boolean default false not null,
  action_status text default 'watchlist' not null,
  rs_line_confirmed boolean,
  base_pattern_valid boolean,
  entry_near_pivot boolean,
  volume_breakout_confirmed boolean,
  liquidity_pass boolean,
  eps_growth_pct numeric,
  eps_accelerating boolean,
  revenue_growth_pct numeric,
  acc_dist_rating text,
  industry_group_rank integer,
  user_id uuid not null,
  signal_state text default 'candidate' not null,
  last_evaluated_at timestamp with time zone,
  last_fundamentals_at timestamp with time zone,
  consecutive_fail_count integer default 0 not null,
  flagged_for_review boolean default false not null,
  last_hard_fail_reason text,
  data_status text default 'fresh' not null,
  constraint watchlist_acc_dist_rating_check check (
    acc_dist_rating = any (array['A', 'B', 'C', 'D', 'E'])
  ),
  constraint watchlist_data_status_check check (
    data_status = any (array['fresh', 'stale', 'error'])
  ),
  constraint watchlist_industry_group_rank_check check (
    industry_group_rank is null
    or (industry_group_rank >= 1 and industry_group_rank <= 197)
  ),
  constraint watchlist_signal_state_check check (
    signal_state = any (array[
      'candidate',
      'evaluated',
      'plan_generated',
      'signal_sent',
      'awaiting_confirmation',
      'snoozed',
      'dismissed',
      'converted_to_trade',
      'flagged_for_review',
      'archived'
    ])
  )
);

create table if not exists public.weekly_reviews (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  week_ending date not null,
  market_phase text,
  ibd_status text,
  spx_distribution_days integer,
  ndx_distribution_days integer,
  ftd_active boolean,
  phase_changed boolean default false not null,
  prior_phase text,
  current_phase text,
  top_sectors text,
  deteriorating_sectors text,
  portfolio_value numeric,
  weekly_pnl_dollar numeric,
  weekly_pnl_pct numeric,
  total_heat_pct numeric,
  heat_ceiling_pct numeric,
  drawdown_from_hwm_pct numeric,
  open_positions_count integer,
  wins_count integer,
  losses_count integer,
  avg_win_r numeric,
  avg_loss_r numeric,
  biggest_rule_violation text,
  next_week_triggers text,
  primary_focus text,
  notes text,
  user_id uuid not null
);

alter table only public.execution_log
  add constraint execution_log_pkey primary key (id);

alter table only public.market_snapshots
  add constraint market_snapshots_pkey primary key (id);

alter table only public.market_snapshots
  add constraint market_snapshots_snapshot_date_key unique (snapshot_date);

alter table only public.notifications
  add constraint notifications_dedupe_key_key unique (dedupe_key);

alter table only public.notifications
  add constraint notifications_pkey primary key (id);

alter table only public.pending_actions
  add constraint pending_actions_pkey primary key (id);

alter table only public.rule_results
  add constraint rule_results_pkey primary key (id);

alter table only public.scan_logs
  add constraint scan_logs_pkey primary key (id);

alter table only public.setup_evaluations
  add constraint setup_evaluations_pkey primary key (id);

alter table only public.trade_plans
  add constraint trade_plans_pkey primary key (id);

alter table only public.trades
  add constraint trades_pkey primary key (id);

alter table only public.user_settings
  add constraint user_settings_pkey primary key (id);

alter table only public.user_settings
  add constraint user_settings_user_id_key unique (user_id);

alter table only public.watchlist
  add constraint watchlist_pkey primary key (id);

alter table only public.weekly_reviews
  add constraint weekly_reviews_pkey primary key (id);

alter table only public.weekly_reviews
  add constraint weekly_reviews_week_ending_key unique (week_ending);

create index if not exists idx_execution_log_pending_action_id
  on public.execution_log using btree (pending_action_id);

create index if not exists idx_execution_log_trade_id
  on public.execution_log using btree (trade_id);

create index if not exists idx_execution_log_user_created_at
  on public.execution_log using btree (user_id, created_at desc);

create index if not exists idx_market_snapshots_snapshot_date
  on public.market_snapshots using btree (snapshot_date desc);

create unique index if not exists idx_market_snapshots_snapshot_date_unique
  on public.market_snapshots using btree (snapshot_date);

create unique index if not exists idx_notifications_dedupe_key
  on public.notifications using btree (dedupe_key);

create index if not exists idx_notifications_user_trigger_sent_at
  on public.notifications using btree (user_id, trigger_type, sent_at desc);

create index if not exists idx_pending_actions_trade_id
  on public.pending_actions using btree (trade_id);

create index if not exists idx_pending_actions_user_id
  on public.pending_actions using btree (user_id);

create index if not exists idx_pending_actions_user_state_urgency
  on public.pending_actions using btree (user_id, state, urgency);

create index if not exists idx_pending_actions_watchlist_id
  on public.pending_actions using btree (watchlist_id);

create index if not exists idx_rule_results_setup_evaluation_id
  on public.rule_results using btree (setup_evaluation_id);

create index if not exists idx_scan_logs_job_window
  on public.scan_logs using btree (job_type, window_key);

create index if not exists idx_scan_logs_job_window_ticker
  on public.scan_logs using btree (job_type, window_key, ticker);

create index if not exists idx_scan_logs_user_started_at
  on public.scan_logs using btree (user_id, started_at desc);

create index if not exists idx_setup_evaluations_evaluation_date
  on public.setup_evaluations using btree (evaluation_date desc);

create index if not exists idx_setup_evaluations_watchlist_id
  on public.setup_evaluations using btree (watchlist_id);

create index if not exists idx_trade_plans_approval_status
  on public.trade_plans using btree (approval_status);

create index if not exists idx_trade_plans_plan_date
  on public.trade_plans using btree (plan_date desc);

create index if not exists idx_trade_plans_watchlist_id
  on public.trade_plans using btree (watchlist_id);

create index if not exists idx_trades_entry_date
  on public.trades using btree (entry_date desc);

create index if not exists idx_trades_status
  on public.trades using btree (status);

create index if not exists idx_trades_ticker
  on public.trades using btree (ticker);

create index if not exists idx_watchlist_action_status
  on public.watchlist using btree (action_status);

create index if not exists idx_watchlist_status
  on public.watchlist using btree (status);

create index if not exists idx_watchlist_ticker
  on public.watchlist using btree (ticker);

create index if not exists idx_weekly_reviews_week_ending
  on public.weekly_reviews using btree (week_ending desc);

create or replace trigger trg_user_settings_touch_updated_at
before update on public.user_settings
for each row execute function public.touch_updated_at();

alter table only public.execution_log
  add constraint execution_log_pending_action_id_fkey
  foreign key (pending_action_id) references public.pending_actions(id) on delete set null;

alter table only public.execution_log
  add constraint execution_log_trade_id_fkey
  foreign key (trade_id) references public.trades(id) on delete set null;

alter table only public.execution_log
  add constraint execution_log_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table only public.market_snapshots
  add constraint market_snapshots_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table only public.notifications
  add constraint notifications_pending_action_id_fkey
  foreign key (pending_action_id) references public.pending_actions(id) on delete set null;

alter table only public.notifications
  add constraint notifications_trade_id_fkey
  foreign key (trade_id) references public.trades(id) on delete set null;

alter table only public.notifications
  add constraint notifications_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table only public.pending_actions
  add constraint pending_actions_trade_id_fkey
  foreign key (trade_id) references public.trades(id) on delete set null;

alter table only public.pending_actions
  add constraint pending_actions_trade_plan_id_fkey
  foreign key (trade_plan_id) references public.trade_plans(id) on delete set null;

alter table only public.pending_actions
  add constraint pending_actions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table only public.pending_actions
  add constraint pending_actions_watchlist_id_fkey
  foreign key (watchlist_id) references public.watchlist(id) on delete set null;

alter table only public.rule_results
  add constraint rule_results_setup_evaluation_id_fkey
  foreign key (setup_evaluation_id) references public.setup_evaluations(id) on delete cascade;

alter table only public.rule_results
  add constraint rule_results_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table only public.scan_logs
  add constraint scan_logs_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table only public.setup_evaluations
  add constraint setup_evaluations_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table only public.setup_evaluations
  add constraint setup_evaluations_watchlist_id_fkey
  foreign key (watchlist_id) references public.watchlist(id) on delete cascade;

alter table only public.trade_plans
  add constraint trade_plans_setup_evaluation_id_fkey
  foreign key (setup_evaluation_id) references public.setup_evaluations(id) on delete set null;

alter table only public.trade_plans
  add constraint trade_plans_source_watchlist_id_fkey
  foreign key (source_watchlist_id) references public.watchlist(id) on delete set null;

alter table only public.trade_plans
  add constraint trade_plans_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table only public.trade_plans
  add constraint trade_plans_watchlist_id_fkey
  foreign key (watchlist_id) references public.watchlist(id) on delete cascade;

alter table only public.trades
  add constraint trades_trade_plan_id_fkey
  foreign key (trade_plan_id) references public.trade_plans(id) on delete set null;

alter table only public.trades
  add constraint trades_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table only public.user_settings
  add constraint user_settings_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table only public.watchlist
  add constraint watchlist_market_snapshot_id_fkey
  foreign key (market_snapshot_id) references public.market_snapshots(id) on delete set null;

alter table only public.watchlist
  add constraint watchlist_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table only public.weekly_reviews
  add constraint weekly_reviews_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.execution_log enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.notifications enable row level security;
alter table public.pending_actions enable row level security;
alter table public.rule_results enable row level security;
alter table public.scan_logs enable row level security;
alter table public.setup_evaluations enable row level security;
alter table public.trade_plans enable row level security;
alter table public.trades enable row level security;
alter table public.user_settings enable row level security;
alter table public.watchlist enable row level security;
alter table public.weekly_reviews enable row level security;

create policy execution_log_delete_own on public.execution_log for delete using (auth.uid() = user_id);
create policy execution_log_insert_own on public.execution_log for insert with check (auth.uid() = user_id);
create policy execution_log_select_own on public.execution_log for select using (auth.uid() = user_id);
create policy execution_log_update_own on public.execution_log for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy market_snapshots_delete_own on public.market_snapshots for delete using (auth.uid() = user_id);
create policy market_snapshots_insert_own on public.market_snapshots for insert with check (auth.uid() = user_id);
create policy market_snapshots_select_own on public.market_snapshots for select using (auth.uid() = user_id);
create policy market_snapshots_update_own on public.market_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy notifications_delete_own on public.notifications for delete using (auth.uid() = user_id);
create policy notifications_insert_own on public.notifications for insert with check (auth.uid() = user_id);
create policy notifications_select_own on public.notifications for select using (auth.uid() = user_id);
create policy notifications_update_own on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy pending_actions_delete_own on public.pending_actions for delete using (auth.uid() = user_id);
create policy pending_actions_insert_own on public.pending_actions for insert with check (auth.uid() = user_id);
create policy pending_actions_select_own on public.pending_actions for select using (auth.uid() = user_id);
create policy pending_actions_update_own on public.pending_actions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy rule_results_delete_own on public.rule_results for delete using (auth.uid() = user_id);
create policy rule_results_insert_own on public.rule_results for insert with check (auth.uid() = user_id);
create policy rule_results_select_own on public.rule_results for select using (auth.uid() = user_id);
create policy rule_results_update_own on public.rule_results for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy scan_logs_delete_own on public.scan_logs for delete using (auth.uid() = user_id);
create policy scan_logs_insert_own on public.scan_logs for insert with check (auth.uid() = user_id);
create policy scan_logs_select_own on public.scan_logs for select using (auth.uid() = user_id);
create policy scan_logs_update_own on public.scan_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy setup_evaluations_delete_own on public.setup_evaluations for delete using (auth.uid() = user_id);
create policy setup_evaluations_insert_own on public.setup_evaluations for insert with check (auth.uid() = user_id);
create policy setup_evaluations_select_own on public.setup_evaluations for select using (auth.uid() = user_id);
create policy setup_evaluations_update_own on public.setup_evaluations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy trade_plans_delete_own on public.trade_plans for delete using (auth.uid() = user_id);
create policy trade_plans_insert_own on public.trade_plans for insert with check (auth.uid() = user_id);
create policy trade_plans_select_own on public.trade_plans for select using (auth.uid() = user_id);
create policy trade_plans_update_own on public.trade_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy trades_delete_own on public.trades for delete using (auth.uid() = user_id);
create policy trades_insert_own on public.trades for insert with check (auth.uid() = user_id);
create policy trades_select_own on public.trades for select using (auth.uid() = user_id);
create policy trades_update_own on public.trades for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy user_settings_delete_own on public.user_settings for delete using (auth.uid() = user_id);
create policy user_settings_insert_own on public.user_settings for insert with check (auth.uid() = user_id);
create policy user_settings_select_own on public.user_settings for select using (auth.uid() = user_id);
create policy user_settings_update_own on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy watchlist_delete_own on public.watchlist for delete using (auth.uid() = user_id);
create policy watchlist_insert_own on public.watchlist for insert with check (auth.uid() = user_id);
create policy watchlist_select_own on public.watchlist for select using (auth.uid() = user_id);
create policy watchlist_update_own on public.watchlist for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy weekly_reviews_delete_own on public.weekly_reviews for delete using (auth.uid() = user_id);
create policy weekly_reviews_insert_own on public.weekly_reviews for insert with check (auth.uid() = user_id);
create policy weekly_reviews_select_own on public.weekly_reviews for select using (auth.uid() = user_id);
create policy weekly_reviews_update_own on public.weekly_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.expire_stale_buy_signals()
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  update public.pending_actions
  set state = 'expired',
      resolved_at = coalesce(resolved_at, now())
  where action_type = 'buy_signal'
    and expires_at is not null
    and expires_at < now()
    and state not in ('executed', 'dismissed', 'expired');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.get_open_pending_actions_count(p_user_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from public.pending_actions
  where user_id = p_user_id
    and state = 'awaiting_confirmation';
$$;

create or replace function public.mark_notification_resolved(p_dedupe_key text)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  update public.notifications
  set resolved_at = now()
  where dedupe_key = p_dedupe_key
    and resolved_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.get_single_user_id()
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
begin
  select user_id
  into v_user_id
  from public.user_settings
  limit 1;

  if v_user_id is null then
    raise exception 'No user_id found in public.user_settings';
  end if;

  return v_user_id;
end;
$$;


create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null
       and cmd.schema_name in ('public')
       and cmd.schema_name not in ('pg_catalog', 'information_schema')
       and cmd.schema_name not like 'pg_toast%'
       and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
      exception
        when others then
          null;
      end;
    end if;
  end loop;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

grant all on function public.expire_stale_buy_signals() to anon, authenticated, service_role;
grant all on function public.get_open_pending_actions_count(uuid) to anon, authenticated, service_role;
grant all on function public.get_single_user_id() to anon, authenticated, service_role;
grant all on function public.mark_notification_resolved(text) to anon, authenticated, service_role;
grant all on function public.rls_auto_enable() to anon, authenticated, service_role;
grant all on function public.touch_updated_at() to anon, authenticated, service_role;

grant all on table public.execution_log to anon, authenticated, service_role;
grant all on table public.market_snapshots to anon, authenticated, service_role;
grant all on table public.notifications to anon, authenticated, service_role;
grant all on table public.pending_actions to anon, authenticated, service_role;
grant all on table public.rule_results to anon, authenticated, service_role;
grant all on table public.scan_logs to anon, authenticated, service_role;
grant all on table public.setup_evaluations to anon, authenticated, service_role;
grant all on table public.trade_plans to anon, authenticated, service_role;
grant all on table public.trades to anon, authenticated, service_role;
grant all on table public.user_settings to anon, authenticated, service_role;
grant all on table public.watchlist to anon, authenticated, service_role;
grant all on table public.weekly_reviews to anon, authenticated, service_role;