import type { FairValueSnapshot } from './types'

export type ValuationProfile =
  | 'elite_compounder'
  | 'quality_grower'
  | 'average_stable'
  | 'cyclical'
  | 'financial'

function isNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value)
}

export function getValuationProfile(snapshot: FairValueSnapshot & {
  roicTtm?: number | null
  roic5yAvg?: number | null
  grossMarginTtm?: number | null
  operatingMarginTtm?: number | null
  debtToEquity?: number | null
  netDebtToEbitda?: number | null
  revenueGrowth3yCagr?: number | null
  criticalRedFlags?: number | null
}): ValuationProfile {
  const roicTtm = snapshot.roicTtm
  const roic5yAvg = snapshot.roic5yAvg
  const grossMargin = snapshot.grossMarginTtm
  const operatingMargin = snapshot.operatingMarginTtm
  const debtToEquity = snapshot.debtToEquity
  const netDebtToEbitda = snapshot.netDebtToEbitda
  const revenueGrowth = snapshot.revenueGrowth3yCagr
  const criticalRedFlags = snapshot.criticalRedFlags ?? 0

  if (snapshot.sector === 'Financials') {
    const isHighMarginFinancial =
      (isNumber(grossMargin) && grossMargin > 50) ||
      (isNumber(operatingMargin) && operatingMargin > 30) ||
      (isNumber(roicTtm) && roicTtm > 20)

    if (!isHighMarginFinancial) {
      return 'financial'
    }
  }

  if (criticalRedFlags > 0) {
    return 'cyclical'
  }

  const isCyclicalSector = ['Energy', 'Materials', 'Industrials'].includes(snapshot.sector ?? '')

  const cyclicalSignals = [
    isNumber(roicTtm) && roicTtm < 8,
    isNumber(operatingMargin) && operatingMargin < 8,
    isNumber(netDebtToEbitda) && netDebtToEbitda > 4,
  ].filter(Boolean).length

  if (isCyclicalSector && cyclicalSignals >= 1) {
    return 'cyclical'
  }

  if (!isCyclicalSector && cyclicalSignals >= 2) {
    return 'cyclical'
  }

  const eliteSignals = [
    isNumber(roicTtm) && roicTtm >= 18,
    isNumber(roic5yAvg) && roic5yAvg >= 18,
    isNumber(grossMargin) && grossMargin >= 55,
    isNumber(operatingMargin) && operatingMargin >= 20,
    !isNumber(debtToEquity) || debtToEquity <= 1,
    !isNumber(netDebtToEbitda) || netDebtToEbitda <= 2,
    isNumber(revenueGrowth) && revenueGrowth >= 8,
  ].filter(Boolean).length

  if (eliteSignals >= 5) {
    return 'elite_compounder'
  }

  const qualitySignals = [
    (isNumber(roicTtm) && roicTtm >= 12) || (isNumber(roic5yAvg) && roic5yAvg >= 12),
    isNumber(grossMargin) && grossMargin >= 40,
    isNumber(operatingMargin) && operatingMargin >= 12,
    !isNumber(debtToEquity) || debtToEquity <= 1.5,
    !isNumber(netDebtToEbitda) || netDebtToEbitda <= 3,
    isNumber(revenueGrowth) && revenueGrowth >= 5,
  ].filter(Boolean).length

  if (qualitySignals >= 4) {
    return 'quality_grower'
  }

  return 'average_stable'
}