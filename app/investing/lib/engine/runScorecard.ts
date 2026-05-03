import type {
  InvestingSnapshot,
  QuantitativeScorecardResult,
  ScorecardCategoryScore,
  ScreenerRuleResult,
} from './types'

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Number(value.toFixed(1))))
}

function buildCategoryScore(args: {
  id: 'valuation' | 'quality' | 'financialHealth' | 'growth'
  label: string
  rules: ScreenerRuleResult[]
}): ScorecardCategoryScore {
  const { id, label, rules } = args

  const passed = rules.filter((rule) => rule.status === 'pass').length
  const failed = rules.filter((rule) => rule.status === 'fail').length
  const inconclusive = rules.filter((rule) => rule.status === 'inconclusive').length

  const scoredRules = passed + failed
  const rawScore = scoredRules === 0 ? 0 : (passed / scoredRules) * 10
  const score = Number(rawScore.toFixed(1))

  let explanation = ''

  if (scoredRules === 0) {
    explanation = `${label} score is 0.0/10 because no rules could be scored yet.`
  } else {
    explanation = `${label} score is ${score.toFixed(1)}/10 based on ${passed} pass, ${failed} fail, and ${inconclusive} inconclusive rule(s).`
  }

  return {
    id,
    label,
    score,
    maxScore: 10,
    passed,
    failed,
    inconclusive,
    explanation,
  }
}

function getValuationOverlay(snapshot?: InvestingSnapshot): {
  adjustedScore: number | null
  overlayText: string | null
} {
  if (!snapshot) {
    return { adjustedScore: null, overlayText: null }
  }

  const price = snapshot.currentPrice
  const fairValueBase = snapshot.fairValueBase
  const methodCount = snapshot.fairValueValidMethodCount ?? 0

  if (
    price == null ||
    fairValueBase == null ||
    !Number.isFinite(price) ||
    !Number.isFinite(fairValueBase) ||
    fairValueBase <= 0 ||
    methodCount <= 0
  ) {
    return { adjustedScore: null, overlayText: null }
  }

  const discountToFairValue = ((fairValueBase - price) / fairValueBase) * 100
  const confidence = methodCount >= 3 ? 1.5 : methodCount >= 2 ? 1.2 : 1.0

  let overlay = 0

  if (discountToFairValue >= 30) overlay = 3.0 * confidence
  else if (discountToFairValue >= 20) overlay = 2.5 * confidence
  else if (discountToFairValue >= 10) overlay = 2.0 * confidence
  else if (discountToFairValue >= 0) overlay = 1.0 * confidence
  else if (discountToFairValue >= -10) overlay = 0
  else if (discountToFairValue >= -20) overlay = -1.0 * confidence
  else if (discountToFairValue >= -30) overlay = -2.0 * confidence
  else overlay = -3.0 * confidence

  return {
    adjustedScore: overlay,
    overlayText: `Fair value overlay applied from price vs fair value base (${discountToFairValue.toFixed(
      1
    )}%) using ${methodCount} valuation method(s).`,
  }
}

export function runQuantitativeScorecard(
  rules: ScreenerRuleResult[],
  snapshot?: InvestingSnapshot
): QuantitativeScorecardResult {
  const valuationRules = rules.filter((rule) => rule.id.startsWith('SCR-VAL-'))
  const qualityRules = rules.filter((rule) => rule.id.startsWith('SCR-PROF-'))
  const financialHealthRules = rules.filter((rule) => rule.id.startsWith('SCR-FH-'))
  const growthRules = rules.filter((rule) => rule.id.startsWith('SCR-GR-'))

  const valuationCategory = buildCategoryScore({
    id: 'valuation',
    label: 'Valuation',
    rules: valuationRules,
  })

  const valuationOverlay = getValuationOverlay(snapshot)

  const adjustedValuationScore =
    valuationOverlay.adjustedScore == null
      ? valuationCategory.score
      : clampScore(valuationCategory.score + valuationOverlay.adjustedScore)

  const adjustedValuationExplanation =
    valuationOverlay.overlayText == null
      ? valuationCategory.explanation
      : `${valuationCategory.explanation} ${valuationOverlay.overlayText} Final valuation score is ${adjustedValuationScore.toFixed(
          1
        )}/10.`

  const categories: ScorecardCategoryScore[] = [
    {
      ...valuationCategory,
      score: adjustedValuationScore,
      explanation: adjustedValuationExplanation,
    },
    buildCategoryScore({
      id: 'quality',
      label: 'ROIC / Quality',
      rules: qualityRules,
    }),
    buildCategoryScore({
      id: 'financialHealth',
      label: 'Financial Health',
      rules: financialHealthRules,
    }),
    buildCategoryScore({
      id: 'growth',
      label: 'Growth / Business Performance',
      rules: growthRules,
    }),
  ]

  const overallScore =
    categories.length === 0
      ? 0
      : Number(
          (
            categories.reduce((sum, category) => sum + category.score, 0) / categories.length
          ).toFixed(1)
        )

  return {
    categories,
    overallScore,
    maxScore: 10,
  }
}