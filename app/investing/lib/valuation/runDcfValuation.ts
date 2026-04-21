import type { FairValueSnapshot, RangeValuation } from './types'
import { clamp, isValidPositiveNumber } from './utils'

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

export function runDcfValuation(snapshot: FairValueSnapshot): RangeValuation {
  const fcf0 = snapshot.freeCashFlowTtm
  const sharesOut = snapshot.dilutedSharesOutstanding
  const netDebt = snapshot.netDebt ?? 0

  if (!isValidPositiveNumber(fcf0) || !isValidPositiveNumber(sharesOut)) {
    return { low: null, base: null, high: null }
  }

  const historicalCagr = snapshot.historicalFcfCagr3y ?? 8
  const g1Base = clamp(historicalCagr / 100, 0.03, 0.12)

  const low = runSingleDcf(fcf0, sharesOut, netDebt, {
    g1: clamp(g1Base - 0.03, 0.02, 0.10),
    g2: 0.04,
    tg: 0.02,
    r: 0.11,
  })

  const base = runSingleDcf(fcf0, sharesOut, netDebt, {
    g1: clamp(g1Base, 0.03, 0.12),
    g2: 0.06,
    tg: 0.025,
    r: 0.10,
  })

  const high = runSingleDcf(fcf0, sharesOut, netDebt, {
    g1: clamp(g1Base + 0.02, 0.04, 0.16),
    g2: 0.08,
    tg: 0.03,
    r: 0.09,
  })

  return { low, base, high }
}