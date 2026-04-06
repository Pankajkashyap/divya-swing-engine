-- PRODUCTION DEPLOYMENT INSTRUCTIONS
-- 1. Go to your Supabase production dashboard
-- 2. Click SQL Editor in the left sidebar
-- 3. Paste this entire file and click Run
-- 4. Confirm no errors before deploying code changes
-- 5. Then deploy the Edge Function and UI changes

-- 1. Add screener audit columns to watchlist table
ALTER TABLE public.watchlist
  ADD COLUMN IF NOT EXISTS screener_run_id text null,
  ADD COLUMN IF NOT EXISTS screened_price numeric null,
  ADD COLUMN IF NOT EXISTS screened_avg_volume numeric null,
  ADD COLUMN IF NOT EXISTS screened_eps_growth_pct numeric null,
  ADD COLUMN IF NOT EXISTS screened_revenue_growth_pct numeric null,
  ADD COLUMN IF NOT EXISTS screened_at timestamptz null;

-- 2. Create screener_candidate_log table
create table if not exists public.screener_candidate_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id)
    on delete cascade,
  screener_run_id text not null,
  ticker text not null,
  company_name text null,
  pass1_price numeric null,
  pass1_volume numeric null,
  pass1_passed boolean not null default false,
  pass2_eps_growth_pct numeric null,
  pass2_revenue_growth_pct numeric null,
  pass2_passed boolean not null default false,
  final_passed boolean not null default false,
  rejection_reason text null,
  watchlist_id uuid null references public.watchlist(id)
    on delete set null
);

alter table public.screener_candidate_log
  enable row level security;

create policy "Users can read own screener logs"
  on public.screener_candidate_log for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Service role can insert screener logs"
  on public.screener_candidate_log for insert
  to service_role
  with check (true);

create policy "Service role can update screener logs"
  on public.screener_candidate_log for update
  to service_role
  using (true);

create index if not exists screener_candidate_log_ticker_idx
  on public.screener_candidate_log(ticker);

create index if not exists screener_candidate_log_run_idx
  on public.screener_candidate_log(screener_run_id);

create index if not exists screener_candidate_log_watchlist_idx
  on public.screener_candidate_log(watchlist_id);