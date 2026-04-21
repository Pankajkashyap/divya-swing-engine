import { buildFairValueRange } from './buildFairValueRange'
import { runComparableValuation } from './runComparableValuation'
import { runDcfValuation } from './runDcfValuation'
import { runOwnerEarningsValuation } from './runOwnerEarningsValuation'
import type { FairValueSnapshot } from './types'

export function runFairValueEngine(snapshot: FairValueSnapshot) {
  const dcf = runDcfValuation(snapshot)
  const ownerEarnings = runOwnerEarningsValuation(snapshot)
  const comparables = runComparableValuation(snapshot)

  const range = buildFairValueRange({
    dcf,
    ownerEarnings,
    comparables,
  })

  return {
    dcf,
    ownerEarnings,
    comparables,
    range,
  }
}