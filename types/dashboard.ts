export type MarketSnapshot = {
  id: string
  market_phase: string
  max_long_exposure_pct: number | null
  snapshot_date: string | null  
}

export type WatchlistRow = {
  id: string
  ticker: string
  company_name: string | null
  source?: string | null
  setup_grade: string | null
  trend_template_pass: boolean | null
  volume_dry_up_pass: boolean | null
  earnings_within_2_weeks: boolean | null
  binary_event_risk: boolean | null
  pivot_price: number | null
  entry_zone_low: number | null
  entry_zone_high: number | null
  stop_price: number | null
  target_1_price: number | null
  target_2_price: number | null
  rs_line_confirmed: boolean | null
  base_pattern_valid: boolean | null
  entry_near_pivot: boolean | null
  volume_breakout_confirmed: boolean | null
  liquidity_pass: boolean | null
  eps_growth_pct: number | null
  eps_accelerating: boolean | null
  revenue_growth_pct: number | null
  acc_dist_rating: string | null
  industry_group_rank: number | null
}

export type EvalResult = {
  id: string | null
  verdict: 'pass' | 'watch' | 'fail'
  score_total: number
  fail_reason: string | null
  notes: string | null
  market_phase_pass: boolean
  trend_template_pass: boolean
  liquidity_pass: boolean
  base_pattern_valid: boolean
  volume_pattern_valid: boolean
  rs_line_confirmed: boolean
  entry_near_pivot_pass: boolean
  volume_breakout_pass: boolean
  earnings_risk_flag: boolean
  binary_event_flag: boolean
  setup_grade: string | null
  fundamental_pass: boolean
}

export type TradePlanResult = {
  risk_pct: number
  dollar_risk: number
  entry_price: number
  stop_price: number
  risk_per_share: number
  planned_shares: number
  position_value: number
  final_shares: number
  final_position_value: number
  expected_rr: number
  approval_status: 'approved' | 'blocked'
  blocked_reason: string | null
}

export type SavedTradePlan = {
  id: string
  plan_date: string
  side: string
  entry_price: number | null
  stop_price: number | null
  final_shares: number | null
  final_position_value: number | null
  expected_rr: number | null
  approval_status: string
  blocked_reason: string | null
}

export type SavedTrade = {
  id: string
  ticker: string
  side: string
  status: string
  entry_date: string | null
  entry_price_actual: number | null
  shares_entered: number | null
  stop_price_initial: number | null
  stop_price_current: number | null
  target_1_price: number | null
  target_2_price: number | null
  shares_exited: number | null
  exit_date: string | null
  exit_price_actual: number | null
  pnl_dollar: number | null
  pnl_pct: number | null
}

export type RuleAuditRow = {
  id: string
  setup_evaluation_id: string
  rule_code: string
  rule_name: string
  passed: boolean | null
  actual_value_text: string | null
  actual_value_numeric: number | null
  notes: string | null
}

export type TradeCreationMessage = {
  type: 'success' | 'error' | 'info'
  text: string
}