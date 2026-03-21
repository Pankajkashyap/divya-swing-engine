type MarketSnapshot = {
  market_phase: string
  max_long_exposure_pct: number | null
}

type WatchlistRow = {
  id: string
  ticker: string
  setup_grade: string | null
  pivot_price: number | null
  entry_zone_low: number | null
  entry_zone_high: number | null
  stop_price: number | null
  target_1_price: number | null
  target_2_price: number | null
  earnings_within_2_weeks: boolean | null
  binary_event_risk: boolean | null
}

type TradePlanOutput = {
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

export function generateTradePlan(
  market: MarketSnapshot,
  stock: WatchlistRow,
  portfolioValue: number
): TradePlanOutput {
  const grade = stock.setup_grade ?? 'C'

  // -----------------------
  // Risk % based on grade
  // -----------------------
  let riskPct = 0

  if (grade === 'A+') riskPct = 2
  else if (grade === 'A') riskPct = 1
  else if (grade === 'B') riskPct = 0.5
  else riskPct = 0.25

  // -----------------------
  // Market adjustment
  // -----------------------
  if (market.market_phase === 'under_pressure') {
    riskPct *= 0.5
  }

  if (market.market_phase === 'correction' || market.market_phase === 'bear') {
    return {
      risk_pct: 0,
      dollar_risk: 0,
      entry_price: 0,
      stop_price: 0,
      risk_per_share: 0,
      planned_shares: 0,
      position_value: 0,
      final_shares: 0,
      final_position_value: 0,
      expected_rr: 0,
      approval_status: 'blocked',
      blocked_reason: 'Market not favorable for new long trades',
    }
  }

  // -----------------------
  // Entry & stop
  // -----------------------
  const entry =
    stock.entry_zone_low ??
    stock.pivot_price ??
    0

  const stop = stock.stop_price ?? 0

  if (!entry || !stop) {
    return {
      risk_pct: riskPct,
      dollar_risk: 0,
      entry_price: 0,
      stop_price: 0,
      risk_per_share: 0,
      planned_shares: 0,
      position_value: 0,
      final_shares: 0,
      final_position_value: 0,
      expected_rr: 0,
      approval_status: 'blocked',
      blocked_reason: 'Missing entry or stop price',
    }
  }

  const riskPerShare = entry - stop

  if (riskPerShare <= 0) {
    return {
      risk_pct: riskPct,
      dollar_risk: 0,
      entry_price: entry,
      stop_price: stop,
      risk_per_share: 0,
      planned_shares: 0,
      position_value: 0,
      final_shares: 0,
      final_position_value: 0,
      expected_rr: 0,
      approval_status: 'blocked',
      blocked_reason: 'Invalid stop placement',
    }
  }

  // -----------------------
  // Dollar risk
  // -----------------------
  const dollarRisk = (portfolioValue * riskPct) / 100

  // -----------------------
  // Shares
  // -----------------------
  const plannedShares = Math.floor(dollarRisk / riskPerShare)

  const positionValue = plannedShares * entry

  // -----------------------
  // Position cap (25%)
  // -----------------------
  const maxPositionValue = (portfolioValue * 25) / 100

  let finalShares = plannedShares
  let finalPositionValue = positionValue

  if (positionValue > maxPositionValue) {
    finalShares = Math.floor(maxPositionValue / entry)
    finalPositionValue = finalShares * entry
  }

  // -----------------------
  // Event risk adjustment
  // -----------------------
  if (stock.earnings_within_2_weeks || stock.binary_event_risk) {
    finalShares = Math.floor(finalShares * 0.5)
    finalPositionValue = finalShares * entry
  }

  // -----------------------
  // Expected RR
  // -----------------------
  let expectedRR = 0

  if (stock.target_1_price) {
    expectedRR = (stock.target_1_price - entry) / riskPerShare
  }

  return {
    risk_pct: riskPct,
    dollar_risk: dollarRisk,
    entry_price: entry,
    stop_price: stop,
    risk_per_share: riskPerShare,
    planned_shares: plannedShares,
    position_value: positionValue,
    final_shares: finalShares,
    final_position_value: finalPositionValue,
    expected_rr: expectedRR,
    approval_status: 'approved',
    blocked_reason: null,
  }
}