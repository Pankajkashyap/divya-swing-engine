import { getValuationProfile } from './getValuationProfile'
import type { FairValueSnapshot, RangeValuation } from './types'
import { isValidPositiveNumber } from './utils'

function runUsingEbit(snapshot: FairValueSnapshot, lowMultiple: number, baseMultiple: number, highMultiple: number): RangeValuation {
  const ebit = snapshot.ebitTtm
  const sharesOut = snapshot.dilutedSharesOutstanding
  const netDebt = snapshot.netDebt ?? 0

  if (!isValidPositiveNumber(ebit) || !isValidPositiveNumber(sharesOut)) {
    return { low: null, base: null, high: null }
  }

  const lowEv = ebit * lowMultiple
  const baseEv = ebit * baseMultiple
  const highEv = ebit * highMultiple

  return {
    low: Number(((lowEv - netDebt) / sharesOut).toFixed(2)),
    base: Number(((baseEv - netDebt) / sharesOut).toFixed(2)),
    high: Number(((highEv - netDebt) / sharesOut).toFixed(2)),
  }
}

function runUsingFcf(snapshot: FairValueSnapshot, lowMultiple: number, baseMultiple: number, highMultiple: number): RangeValuation {
  const fcf = snapshot.freeCashFlowTtm
  const sharesOut = snapshot.dilutedSharesOutstanding

  if (!isValidPositiveNumber(fcf) || !isValidPositiveNumber(sharesOut)) {
    return { low: null, base: null, high: null }
  }

  const fcfPerShare = fcf / sharesOut

  return {
    low: Number((fcfPerShare * lowMultiple).toFixed(2)),
    base: Number((fcfPerShare * baseMultiple).toFixed(2)),
    high: Number((fcfPerShare * highMultiple).toFixed(2)),
  }
}

function runUsingBook(snapshot: FairValueSnapshot): RangeValuation {
  const bvps = snapshot.bookValuePerShareTtm

  if (!isValidPositiveNumber(bvps)) {
    return { low: null, base: null, high: null }
  }

  return {
    low: Number((bvps * 1.2).toFixed(2)),
    base: Number((bvps * 1.8).toFixed(2)),
    high: Number((bvps * 2.4).toFixed(2)),
  }
}

export function runComparableValuation(snapshot: FairValueSnapshot): RangeValuation {
  const profile = getValuationProfile(snapshot)

  if (profile === 'financial') {
    return runUsingBook(snapshot)
  }

  switch (profile) {
    case 'elite_compounder': {
        const ebitResult = runUsingEbit(snapshot, 20, 24, 28)
        if (ebitResult.base != null) return ebitResult
        return runUsingFcf(snapshot, 22, 27, 32)
    }
    case 'quality_grower': {
      const ebitResult = runUsingEbit(snapshot, 15, 19, 23)
      if (ebitResult.base != null) return ebitResult
      return runUsingFcf(snapshot, 17, 22, 27)
    }
    case 'average_stable': {
      const ebitResult = runUsingEbit(snapshot, 12, 15, 18)
      if (ebitResult.base != null) return ebitResult
      return runUsingFcf(snapshot, 14, 18, 22)
    }
    case 'cyclical': {
      const ebitResult = runUsingEbit(snapshot, 8, 11, 14)
      if (ebitResult.base != null) return ebitResult
      return runUsingFcf(snapshot, 10, 13, 16)
    }
    default:
      return { low: null, base: null, high: null }
  }
}