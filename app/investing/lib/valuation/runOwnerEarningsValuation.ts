import type { FairValueSnapshot, RangeValuation } from './types'
import { isValidPositiveNumber } from './utils'

function runSingleOwnerEarnings(
  ocf: number,
  capexProxy: number,
  sharesOut: number,
  netDebt: number,
  maintenanceCapexRatio: number,
  multiple: number
) {
  const maintenanceCapex = capexProxy * maintenanceCapexRatio
  const ownerEarnings = ocf - maintenanceCapex

  if (!Number.isFinite(ownerEarnings) || ownerEarnings <= 0) return null

  const equityValue = ownerEarnings * multiple - netDebt
  const fairValuePerShare = equityValue / sharesOut

  return Number.isFinite(fairValuePerShare) && fairValuePerShare > 0
    ? Number(fairValuePerShare.toFixed(2))
    : null
}

export function runOwnerEarningsValuation(snapshot: FairValueSnapshot): RangeValuation {
  const ocf = snapshot.operatingCashFlowTtm
  const sharesOut = snapshot.dilutedSharesOutstanding
  const netDebt = snapshot.netDebt ?? 0

  if (!isValidPositiveNumber(ocf) || !isValidPositiveNumber(sharesOut)) {
    return { low: null, base: null, high: null }
  }

  const capexProxy = Math.max(ocf - (snapshot.freeCashFlowTtm ?? 0), 0)

  const low = runSingleOwnerEarnings(ocf, capexProxy, sharesOut, netDebt, 0.85, 12)
  const base = runSingleOwnerEarnings(ocf, capexProxy, sharesOut, netDebt, 0.7, 16)
  const high = runSingleOwnerEarnings(ocf, capexProxy, sharesOut, netDebt, 0.55, 20)

  return { low, base, high }
}