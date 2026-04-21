import type { FairValueSnapshot, RangeValuation } from './types'
import { isValidPositiveNumber } from './utils'

function runUsingEbit(snapshot: FairValueSnapshot): RangeValuation {
  const ebit = snapshot.ebitTtm
  const sharesOut = snapshot.dilutedSharesOutstanding
  const netDebt = snapshot.netDebt ?? 0

  if (!isValidPositiveNumber(ebit) || !isValidPositiveNumber(sharesOut)) {
    return { low: null, base: null, high: null }
  }

  const lowEv = ebit * 12
  const baseEv = ebit * 16
  const highEv = ebit * 20

  return {
    low: Number(((lowEv - netDebt) / sharesOut).toFixed(2)),
    base: Number(((baseEv - netDebt) / sharesOut).toFixed(2)),
    high: Number(((highEv - netDebt) / sharesOut).toFixed(2)),
  }
}

function runUsingFcf(snapshot: FairValueSnapshot): RangeValuation {
  const fcf = snapshot.freeCashFlowTtm
  const sharesOut = snapshot.dilutedSharesOutstanding

  if (!isValidPositiveNumber(fcf) || !isValidPositiveNumber(sharesOut)) {
    return { low: null, base: null, high: null }
  }

  const fcfPerShare = fcf / sharesOut

  return {
    low: Number((fcfPerShare * 15).toFixed(2)),
    base: Number((fcfPerShare * 20).toFixed(2)),
    high: Number((fcfPerShare * 25).toFixed(2)),
  }
}

function runUsingBook(snapshot: FairValueSnapshot): RangeValuation {
  const bvps = snapshot.bookValuePerShareTtm

  if (!isValidPositiveNumber(bvps)) {
    return { low: null, base: null, high: null }
  }

  return {
    low: Number((bvps * 1.0).toFixed(2)),
    base: Number((bvps * 1.5).toFixed(2)),
    high: Number((bvps * 2.0).toFixed(2)),
  }
}

export function runComparableValuation(snapshot: FairValueSnapshot): RangeValuation {
  if (snapshot.sector === 'Financials') {
    return runUsingBook(snapshot)
  }

  const ebitResult = runUsingEbit(snapshot)
  if (ebitResult.base != null) return ebitResult

  return runUsingFcf(snapshot)
}