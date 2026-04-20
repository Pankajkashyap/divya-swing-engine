import type {
  QuantitativeScorecardResult,
  ScorecardCategoryScore,
  ScreenerRuleResult,
} from './types'

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

export function runQuantitativeScorecard(
  rules: ScreenerRuleResult[]
): QuantitativeScorecardResult {
  const valuationRules = rules.filter((rule) => rule.id.startsWith('SCR-VAL-'))
  const qualityRules = rules.filter((rule) => rule.id.startsWith('SCR-PROF-'))
  const financialHealthRules = rules.filter((rule) => rule.id.startsWith('SCR-FH-'))
  const growthRules = rules.filter((rule) => rule.id.startsWith('SCR-GR-'))

  const categories: ScorecardCategoryScore[] = [
    buildCategoryScore({
      id: 'valuation',
      label: 'Valuation',
      rules: valuationRules,
    }),
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