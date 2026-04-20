import type { QuantitativeScorecardResult, RedFlagResult, VerdictResult } from './types'

export function runVerdict(args: {
  scorecard: QuantitativeScorecardResult
  redFlags: RedFlagResult[]
}): VerdictResult {
  const { scorecard, redFlags } = args

  const overallScore = scorecard.overallScore
  const criticalRedFlags = redFlags.filter(
    (flag) => flag.triggered && flag.severity === 'critical'
  ).length
  const warningRedFlags = redFlags.filter(
    (flag) => flag.triggered && flag.severity === 'warning'
  ).length

  if (criticalRedFlags > 0) {
    return {
      label: 'Red Flag',
      explanation: `Verdict is Red Flag because ${criticalRedFlags} critical red flag(s) were triggered, overriding the quantitative score of ${overallScore.toFixed(1)}/10.`,
      overallScore,
      criticalRedFlags,
      warningRedFlags,
    }
  }

  if (overallScore >= 8.5) {
    return {
      label: 'Strong Buy',
      explanation: `Verdict is Strong Buy because the quantitative score is ${overallScore.toFixed(1)}/10 with no critical red flags.`,
      overallScore,
      criticalRedFlags,
      warningRedFlags,
    }
  }

  if (overallScore >= 7.0) {
    return {
      label: 'Buy',
      explanation: `Verdict is Buy because the quantitative score is ${overallScore.toFixed(1)}/10 with no critical red flags.`,
      overallScore,
      criticalRedFlags,
      warningRedFlags,
    }
  }

  if (overallScore >= 5.0) {
    return {
      label: 'Hold',
      explanation: `Verdict is Hold because the quantitative score is ${overallScore.toFixed(1)}/10. The business may be acceptable, but it does not clear the stronger conviction thresholds yet.`,
      overallScore,
      criticalRedFlags,
      warningRedFlags,
    }
  }

  return {
    label: 'Avoid',
    explanation: `Verdict is Avoid because the quantitative score is only ${overallScore.toFixed(1)}/10, which is below the minimum acceptable threshold.`,
    overallScore,
    criticalRedFlags,
    warningRedFlags,
  }
}