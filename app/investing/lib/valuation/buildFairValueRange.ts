import type { FairValueRangeResult, RangeValuation } from './types'
import { isValidPositiveNumber } from './utils'

export function buildFairValueRange(args: {
  dcf?: RangeValuation | null
  ownerEarnings?: RangeValuation | null
  comparables?: RangeValuation | null
}): FairValueRangeResult {
  const methods = [args.dcf, args.ownerEarnings, args.comparables].filter(
    (method): method is RangeValuation => method != null
  )

  const validBaseValues = methods.map((m) => m.base).filter(isValidPositiveNumber)
  const allValidValues = methods.flatMap((m) =>
    [m.low, m.base, m.high].filter(isValidPositiveNumber)
  )

  if (validBaseValues.length === 0 || allValidValues.length === 0) {
    return {
      fairValueLow: null,
      fairValueBase: null,
      fairValueHigh: null,
      validMethodCount: 0,
    }
  }

  const rawLow = Math.min(...allValidValues)
  const rawBase = validBaseValues.reduce((sum, value) => sum + value, 0) / validBaseValues.length
  const rawHigh = Math.max(...allValidValues)

  const fairValueLow = Number(Math.min(rawLow, rawBase).toFixed(2))
  const fairValueBase = Number(rawBase.toFixed(2))
  const fairValueHigh = Number(Math.max(rawHigh, rawBase).toFixed(2))

  return {
    fairValueLow,
    fairValueBase,
    fairValueHigh,
    validMethodCount: validBaseValues.length,
  }
}