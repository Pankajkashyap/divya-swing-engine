export type ValuationScoreInput = {
  currentPrice: number | null
  fairValueLow: number | null
  fairValueBase: number | null
  fairValueHigh: number | null
}

export type ValuationScoreResult = {
  score: number | null
  explanation: string
  metrics: {
    currentPrice: number | null
    fairValueLow: number | null
    fairValueBase: number | null
    fairValueHigh: number | null
    discountToBase: number | null
  }
}

function isNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value)
}

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Number(value.toFixed(1))))
}

export function runValuationScore(input: ValuationScoreInput): ValuationScoreResult {
  const { currentPrice, fairValueLow, fairValueBase, fairValueHigh } = input

  if (!isNumber(currentPrice) || !isNumber(fairValueBase) || fairValueBase <= 0) {
    return {
      score: null,
      explanation:
        'Valuation score could not be calculated because current price or fair value base is missing.',
      metrics: {
        currentPrice,
        fairValueLow,
        fairValueBase,
        fairValueHigh,
        discountToBase: null,
      },
    }
  }

  const discountToBase = ((fairValueBase - currentPrice) / fairValueBase) * 100

  let baseScore = 0

  if (discountToBase >= 40) baseScore = 10
  else if (discountToBase >= 30) baseScore = 9
  else if (discountToBase >= 20) baseScore = 8
  else if (discountToBase >= 10) baseScore = 7
  else if (discountToBase >= 0) baseScore = 6
  else if (discountToBase >= -10) baseScore = 4
  else if (discountToBase >= -20) baseScore = 3
  else if (discountToBase >= -30) baseScore = 2
  else baseScore = 1

  let rangeAdjustment = 0

  if (isNumber(fairValueLow) && currentPrice < fairValueLow) {
    rangeAdjustment += 0.5
  }

  if (isNumber(fairValueHigh) && currentPrice > fairValueHigh) {
    rangeAdjustment -= 1
  }

  const score = clampScore(baseScore + rangeAdjustment)

  const directionText =
    discountToBase >= 0
      ? `${discountToBase.toFixed(1)}% below fair value base`
      : `${Math.abs(discountToBase).toFixed(1)}% above fair value base`

  return {
    score,
    explanation: `Valuation score is ${score.toFixed(
      1
    )}/10 based on price being ${directionText}.`,
    metrics: {
      currentPrice,
      fairValueLow,
      fairValueBase,
      fairValueHigh,
      discountToBase: Number(discountToBase.toFixed(1)),
    },
  }
}