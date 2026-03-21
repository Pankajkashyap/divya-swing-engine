type MarketSnapshot = {
  market_phase: string
}

type WatchlistRow = {
  id: string
  ticker: string
  setup_grade: string | null
  trend_template_pass: boolean | null
  volume_dry_up_pass: boolean | null
  rr_ratio: number | null
  earnings_within_2_weeks: boolean | null
  binary_event_risk: boolean | null
}

type EvaluationOutput = {
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
  score_total: number
  verdict: 'pass' | 'watch' | 'fail'
  fail_reason: string | null
  notes: string | null
}

export function evaluateSetup(
  market: MarketSnapshot,
  stock: WatchlistRow
): EvaluationOutput {
  const marketPhase = market.market_phase
  const rr = stock.rr_ratio ?? 0
  const grade = stock.setup_grade ?? 'C'

  const market_phase_pass =
    marketPhase === 'confirmed_uptrend' || marketPhase === 'under_pressure'

  const trend_template_pass = stock.trend_template_pass === true
  const liquidity_pass = true
  const base_pattern_valid = true
  const volume_pattern_valid = stock.volume_dry_up_pass === true
  const rs_line_confirmed = true
  const entry_near_pivot_pass = true
  const volume_breakout_pass = true
  const earnings_risk_flag = stock.earnings_within_2_weeks === true
  const binary_event_flag = stock.binary_event_risk === true
  const rr_pass = rr >= 2

  let score = 0
  if (market_phase_pass) score += 2
  if (trend_template_pass) score += 2
  if (volume_pattern_valid) score += 1
  if (rr_pass) score += 2
  if (!earnings_risk_flag) score += 1
  if (!binary_event_flag) score += 1

  if (grade === 'A+') score += 2
  else if (grade === 'A') score += 1.5
  else if (grade === 'B') score += 1

  let verdict: 'pass' | 'watch' | 'fail' = 'fail'
  let fail_reason: string | null = null
  let notes: string | null = null

  if (!market_phase_pass) {
    verdict = 'fail'
    fail_reason = `Market phase ${marketPhase} does not allow new long entries`
  } else if (!trend_template_pass) {
    verdict = 'fail'
    fail_reason = 'Trend template failed'
  } else if (!rr_pass) {
    verdict = 'fail'
    fail_reason = 'Reward/risk below minimum 2:1'
  } else if (earnings_risk_flag || binary_event_flag || grade === 'B' || grade === 'C') {
    verdict = 'watch'
    notes = 'Qualified with caution; reduce size or wait for cleaner conditions'
  } else {
    verdict = 'pass'
    notes = 'Qualified setup for planning'
  }

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
    rr_ratio: stock.rr_ratio,
    setup_grade: stock.setup_grade,
    score_total: score,
    verdict,
    fail_reason,
    notes,
  }
}