import { getValuationProfile } from './getValuationProfile'
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

function getProfileAssumptions(profile: ReturnType<typeof getValuationProfile>) {
  switch (profile) {
    case 'elite_compounder':
      return {
        low: { maintenanceCapexRatio: 0.75, multiple: 16 },
        base: { maintenanceCapexRatio: 0.6, multiple: 20 },
        high: { maintenanceCapexRatio: 0.5, multiple: 24 },
      }
    case 'quality_grower':
      return {
        low: { maintenanceCapexRatio: 0.8, multiple: 14 },
        base: { maintenanceCapexRatio: 0.65, multiple: 18 },
        high: { maintenanceCapexRatio: 0.55, multiple: 22 },
      }
    case 'average_stable':
      return {
        low: { maintenanceCapexRatio: 0.85, multiple: 12 },
        base: { maintenanceCapexRatio: 0.7, multiple: 15 },
        high: { maintenanceCapexRatio: 0.6, multiple: 18 },
      }
    case 'cyclical':
      return {
        low: { maintenanceCapexRatio: 0.9, multiple: 8 },
        base: { maintenanceCapexRatio: 0.8, multiple: 11 },
        high: { maintenanceCapexRatio: 0.7, multiple: 14 },
      }
    case 'financial':
      return {
        low: { maintenanceCapexRatio: 1, multiple: 0 },
        base: { maintenanceCapexRatio: 1, multiple: 0 },
        high: { maintenanceCapexRatio: 1, multiple: 0 },
      }
  }
}

export function runOwnerEarningsValuation(snapshot: FairValueSnapshot): RangeValuation {
  const profile = getValuationProfile(snapshot)

  if (profile === 'financial') {
    return { low: null, base: null, high: null }
  }

  const ocf = snapshot.operatingCashFlowTtm
  const sharesOut = snapshot.dilutedSharesOutstanding
  const netDebt = snapshot.netDebt ?? 0

  if (!isValidPositiveNumber(ocf) || !isValidPositiveNumber(sharesOut)) {
    return { low: null, base: null, high: null }
  }

  const capexProxy = Math.max(ocf - (snapshot.freeCashFlowTtm ?? 0), 0)
  const assumptions = getProfileAssumptions(profile)

  return {
    low: runSingleOwnerEarnings(
      ocf,
      capexProxy,
      sharesOut,
      netDebt,
      assumptions.low.maintenanceCapexRatio,
      assumptions.low.multiple
    ),
    base: runSingleOwnerEarnings(
      ocf,
      capexProxy,
      sharesOut,
      netDebt,
      assumptions.base.maintenanceCapexRatio,
      assumptions.base.multiple
    ),
    high: runSingleOwnerEarnings(
      ocf,
      capexProxy,
      sharesOut,
      netDebt,
      assumptions.high.maintenanceCapexRatio,
      assumptions.high.multiple
    ),
  }
}