import { getValuationProfile } from './getValuationProfile'
import type { FairValueSnapshot, RangeValuation } from './types'
import { isValidPositiveNumber } from './utils'

type DcfAssumptionSet = {
  g1: number
  g2: number
  tg: number
  r: number
}

function runSingleDcf(
  fcf0: number,
  sharesOut: number,
  netDebt: number,
  assumptions: DcfAssumptionSet
) {
  const { g1, g2, tg, r } = assumptions

  if (r <= tg) return null

  let fcf = fcf0
  let pvSum = 0

  for (let year = 1; year <= 5; year += 1) {
    fcf = fcf * (1 + g1)
    pvSum += fcf / Math.pow(1 + r, year)
  }

  for (let year = 6; year <= 10; year += 1) {
    fcf = fcf * (1 + g2)
    pvSum += fcf / Math.pow(1 + r, year)
  }

  const terminalValue = (fcf * (1 + tg)) / (r - tg)
  const pvTerminal = terminalValue / Math.pow(1 + r, 10)

  const enterpriseValue = pvSum + pvTerminal
  const equityValue = enterpriseValue - netDebt
  const fairValuePerShare = equityValue / sharesOut

  return Number.isFinite(fairValuePerShare) && fairValuePerShare > 0
    ? Number(fairValuePerShare.toFixed(2))
    : null
}

function getProfileAssumptions(profile: ReturnType<typeof getValuationProfile>): {
  low: DcfAssumptionSet
  base: DcfAssumptionSet
  high: DcfAssumptionSet
} {
  switch (profile) {
    case 'elite_compounder':
      return {
        low: { r: 0.095, g1: 0.08, g2: 0.05, tg: 0.025 },
        base: { r: 0.085, g1: 0.1, g2: 0.06, tg: 0.03 },
        high: { r: 0.075, g1: 0.12, g2: 0.07, tg: 0.03 },
      }
    case 'quality_grower':
      return {
        low: { r: 0.105, g1: 0.07, g2: 0.04, tg: 0.02 },
        base: { r: 0.095, g1: 0.09, g2: 0.05, tg: 0.025 },
        high: { r: 0.085, g1: 0.11, g2: 0.06, tg: 0.03 },
      }
    case 'average_stable':
      return {
        low: { r: 0.115, g1: 0.05, g2: 0.03, tg: 0.02 },
        base: { r: 0.105, g1: 0.06, g2: 0.04, tg: 0.025 },
        high: { r: 0.095, g1: 0.08, g2: 0.05, tg: 0.025 },
      }
    case 'cyclical':
      return {
        low: { r: 0.13, g1: 0.03, g2: 0.01, tg: 0.015 },
        base: { r: 0.12, g1: 0.05, g2: 0.02, tg: 0.02 },
        high: { r: 0.11, g1: 0.07, g2: 0.03, tg: 0.02 },
      }
    case 'financial':
      return {
        low: { r: 0.12, g1: 0.02, g2: 0.01, tg: 0.015 },
        base: { r: 0.11, g1: 0.03, g2: 0.02, tg: 0.02 },
        high: { r: 0.1, g1: 0.04, g2: 0.02, tg: 0.02 },
      }
  }
}

export function runDcfValuation(snapshot: FairValueSnapshot): RangeValuation {
  const profile = getValuationProfile(snapshot)

  if (profile === 'financial') {
    return { low: null, base: null, high: null }
  }

  const fcf0 = snapshot.freeCashFlowTtm
  const sharesOut = snapshot.dilutedSharesOutstanding
  const netDebt = snapshot.netDebt ?? 0

  if (!isValidPositiveNumber(fcf0) || !isValidPositiveNumber(sharesOut)) {
    return { low: null, base: null, high: null }
  }

  const assumptions = getProfileAssumptions(profile)

  return {
    low: runSingleDcf(fcf0, sharesOut, netDebt, assumptions.low),
    base: runSingleDcf(fcf0, sharesOut, netDebt, assumptions.base),
    high: runSingleDcf(fcf0, sharesOut, netDebt, assumptions.high),
  }
}