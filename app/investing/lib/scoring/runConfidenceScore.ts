import type { Confidence, Verdict } from '@/app/investing/types'

export type ConfidenceScoreInput = {
  overallScore: number | null
  verdict: Verdict | null
  fairValueLow: number | null
  fairValueHigh: number | null
  moatScore: number | null
  valuationScore: number | null
  managementScore: number | null
  roicScore: number | null
  financialHealthScore: number | null
  businessUnderstandingScore: number | null
}

export type ConfidenceScoreResult = {
  confidence: Confidence | null
  explanation: string
}

function isNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value)
}

export function runConfidenceScore(
  input: ConfidenceScoreInput
): ConfidenceScoreResult {
  const {
    overallScore,
    verdict,
    fairValueLow,
    fairValueHigh,
    moatScore,
    valuationScore,
    managementScore,
    roicScore,
    financialHealthScore,
    businessUnderstandingScore,
  } = input

  const populatedScoreCount = [
    moatScore,
    valuationScore,
    managementScore,
    roicScore,
    financialHealthScore,
    businessUnderstandingScore,
  ].filter(isNumber).length

  const hasFairValueRange = isNumber(fairValueLow) && isNumber(fairValueHigh)

  if (!isNumber(overallScore)) {
    return {
      confidence: null,
      explanation: 'Confidence could not be calculated because overall score is missing.',
    }
  }

  if (populatedScoreCount >= 5 && hasFairValueRange && overallScore >= 8) {
    return {
      confidence: 'High',
      explanation: `Confidence is High because overall score is ${overallScore.toFixed(
        1
      )}, fair value range is available, and ${populatedScoreCount} key score components are populated.`,
    }
  }

  if (
    populatedScoreCount >= 3 &&
    overallScore >= 5 &&
    verdict !== 'Red Flag' &&
    verdict !== 'Avoid'
  ) {
    return {
      confidence: 'Medium',
      explanation: `Confidence is Medium because overall score is ${overallScore.toFixed(
        1
      )} and ${populatedScoreCount} key score components are populated, but conviction is not strong enough for High confidence.`,
    }
  }

  return {
    confidence: 'Low',
    explanation: `Confidence is Low because overall score is ${overallScore.toFixed(
      1
    )}, verdict is ${verdict ?? 'unknown'}, and the analysis does not yet have enough strong confirmed inputs for higher confidence.`,
  }
}