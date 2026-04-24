import type { Verdict } from '@/app/investing/types'

export type VerdictScoreInput = {
  overallScore: number | null
  criticalRedFlags: number
  warningRedFlags: number
}

export type VerdictScoreResult = {
  verdict: Verdict | null
  explanation: string
}

function isNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value)
}

export function runVerdictScore(input: VerdictScoreInput): VerdictScoreResult {
  const { overallScore, criticalRedFlags, warningRedFlags } = input

  if (!isNumber(overallScore)) {
    return {
      verdict: null,
      explanation: 'Verdict could not be calculated because overall score is missing.',
    }
  }

  if (criticalRedFlags >= 2) {
    return {
      verdict: 'Red Flag',
      explanation: `Verdict is Red Flag because ${criticalRedFlags} critical red flag(s) were triggered, overriding the overall score of ${overallScore.toFixed(1)}.`,
    }
  }

  if (criticalRedFlags === 1) {
    return {
      verdict: 'Avoid',
      explanation: `Verdict is Avoid because 1 critical red flag was triggered despite the overall score of ${overallScore.toFixed(1)}.`,
    }
  }

  if (overallScore >= 8.5 && warningRedFlags === 0) {
    return {
      verdict: 'Strong Buy',
      explanation: `Verdict is Strong Buy because overall score is ${overallScore.toFixed(1)} with no warning red flags.`,
    }
  }

  if (overallScore >= 7 && warningRedFlags <= 1) {
    return {
      verdict: 'Buy',
      explanation: `Verdict is Buy because overall score is ${overallScore.toFixed(1)} and warning flags remain limited.`,
    }
  }

  if (overallScore >= 5) {
    return {
      verdict: 'Hold',
      explanation: `Verdict is Hold because overall score is ${overallScore.toFixed(1)} but conviction is not strong enough for Buy.`,
    }
  }

  return {
    verdict: 'Avoid',
    explanation: `Verdict is Avoid because overall score is ${overallScore.toFixed(1)} and the setup does not meet conviction thresholds.`,
  }
}