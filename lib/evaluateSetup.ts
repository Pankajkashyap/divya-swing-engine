// =============================
// TYPES
// =============================

export type MarketSnapshot = {
  market_phase: string | null
}

export type WatchlistRow = {
  id: string
  ticker: string

  setup_grade: string | null
  rr_ratio: number | null

  trend_template_pass: boolean | null
  volume_dry_up_pass: boolean | null
  rs_line_confirmed: boolean | null
  base_pattern_valid: boolean | null
  entry_near_pivot: boolean | null
  volume_breakout_confirmed: boolean | null
  liquidity_pass: boolean | null

  earnings_within_2_weeks: boolean | null
  binary_event_risk: boolean | null

  // Fundamentals
  eps_growth_pct: number | null
  eps_accelerating: boolean | null
  revenue_growth_pct: number | null
  acc_dist_rating: string | null
  industry_group_rank: number | null
}

export type EvaluateSetupResult = {
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

  rr_pass: boolean
  rr_ratio: number | null

  setup_grade: string | null

  fundamental_pass: boolean

  score_total: number
  verdict: 'pass' | 'watch' | 'fail'
  fail_reason: string | null
  notes: string | null
}

// =============================
// MAIN FUNCTION
// =============================

export function evaluateSetup(
  market: MarketSnapshot,
  stock: WatchlistRow
): EvaluateSetupResult {

  // =============================
  // FUNDAMENTALS CHECK
  // =============================

  let fundamental_pass = true
  const fundamental_reasons: string[] = []

  if ((stock.eps_growth_pct ?? 0) < 25) {
    fundamental_pass = false
    fundamental_reasons.push("EPS growth < 25%")
  }

  if ((stock.revenue_growth_pct ?? 0) < 25) {
    fundamental_pass = false
    fundamental_reasons.push("Revenue growth < 25%")
  }

  if (stock.acc_dist_rating === "D" || stock.acc_dist_rating === "E") {
    fundamental_pass = false
    fundamental_reasons.push("Weak institutional accumulation (A/D)")
  }

  if ((stock.industry_group_rank ?? 999) > 40) {
    fundamental_pass = false
    fundamental_reasons.push("Industry group not in top 20%")
  }

  const fundamental_reason = fundamental_reasons.join(", ")

  // =============================
  // CORE RULES
  // =============================

  const market_phase_pass =
    market.market_phase !== 'correction' &&
    market.market_phase !== 'bear'

  const trend_template_pass = stock.trend_template_pass === true
  const liquidity_pass = stock.liquidity_pass === true
  const base_pattern_valid = stock.base_pattern_valid === true
  const volume_pattern_valid = stock.volume_dry_up_pass === true
  const rs_line_confirmed = stock.rs_line_confirmed === true
  const entry_near_pivot_pass = stock.entry_near_pivot === true
  const volume_breakout_pass = stock.volume_breakout_confirmed === true

  // =============================
  // RISK FLAGS
  // =============================

  const earnings_risk_flag = stock.earnings_within_2_weeks === true
  const binary_event_flag = stock.binary_event_risk === true

  // =============================
  // RISK / REWARD
  // =============================

  const rr_ratio = stock.rr_ratio ?? null
  const rr_pass = rr_ratio !== null && rr_ratio >= 2

  // =============================
  // SCORE CALCULATION
  // =============================

  let score_total = 0

  if (market_phase_pass) score_total++
  if (trend_template_pass) score_total++
  if (liquidity_pass) score_total++
  if (base_pattern_valid) score_total++
  if (volume_pattern_valid) score_total++
  if (rs_line_confirmed) score_total++
  if (entry_near_pivot_pass) score_total++
  if (volume_breakout_pass) score_total++
  if (rr_pass) score_total++
  if (fundamental_pass) score_total++

  // =============================
  // VERDICT LOGIC
  // =============================

  let verdict: 'pass' | 'watch' | 'fail' = 'pass'
  let fail_reason: string | null = null

  // ❌ HARD FAIL CONDITIONS
  if (!fundamental_pass) {
    verdict = 'fail'
    fail_reason = fundamental_reason
  }

  if (!market_phase_pass) {
    verdict = 'fail'
    fail_reason = 'Unfavorable market conditions'
  }

  // ⚠️ WATCH CONDITIONS
  if (
    verdict !== 'fail' &&
    (!rr_pass || earnings_risk_flag || binary_event_flag)
  ) {
    verdict = 'watch'
    fail_reason = 'Risk conditions not ideal'
  }

  // =============================
  // RETURN
  // =============================

  return {
    market_phase_pass,
    trend_template_pass,
    liquidity_pass,
    base_pattern_valid,
    volume_pattern_valid,
    rs_line_confirmed,
    entry_near_pivot_pass,
    volume_breakout_pass,

    earnings_risk_flag,
    binary_event_flag,

    rr_pass,
    rr_ratio,

    setup_grade: stock.setup_grade,

    fundamental_pass,

    score_total,
    verdict,
    fail_reason,
    notes: null
  }
}