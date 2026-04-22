import type { Sector } from '@/app/investing/types'

export type FinancialHealthScoreInput = {
  sector: Sector | string | null
  debtToEquity: number | null
  netDebtToEbitda: number | null
  interestCoverage: number | null
  currentRatio: number | null
  freeCashFlowTtm: number | null
}

export type FinancialHealthScoreResult = {
  score: number | null
  explanation: string
  factors: {
    sector: string | null
    debtToEquity: number | null
    netDebtToEbitda: number | null
    interestCoverage: number | null
    currentRatio: number | null
    freeCashFlowTtm: number | null
    methodology: 'standard' | 'financials_limited'
  }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Number(value.toFixed(1))))
}

function isNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value)
}

function scoreMaxMetric(value: number, bands: Array<{ max: number; score: number }>) {
  for (const band of bands) {
    if (value <= band.max) return band.score
  }
  return 0
}

function scoreMinMetric(value: number, bands: Array<{ min: number; score: number }>) {
  for (const band of bands) {
    if (value >= band.min) return band.score
  }
  return 0
}

export function runFinancialHealthScore(
  input: FinancialHealthScoreInput
): FinancialHealthScoreResult {
  const {
    sector,
    debtToEquity,
    netDebtToEbitda,
    interestCoverage,
    currentRatio,
    freeCashFlowTtm,
  } = input

  const normalizedSector = sector ?? null
  const isFinancial = normalizedSector === 'Financials'

  if (isFinancial) {
    const components: number[] = []

    if (isNumber(freeCashFlowTtm)) {
      components.push(freeCashFlowTtm > 0 ? 8 : 3)
    }

    if (components.length === 0) {
      return {
        score: null,
        explanation:
          'Financial health score could not be calculated because available Financials-specific inputs are limited.',
        factors: {
          sector: normalizedSector,
          debtToEquity,
          netDebtToEbitda,
          interestCoverage,
          currentRatio,
          freeCashFlowTtm,
          methodology: 'financials_limited',
        },
      }
    }

    const rawScore = components.reduce((sum, value) => sum + value, 0) / components.length
    const score = clampScore(rawScore)

    return {
      score,
      explanation: `Financial health score is ${score.toFixed(
        1
      )}/10 using limited Financials logic. Positive free cash flow was ${
        freeCashFlowTtm != null && freeCashFlowTtm > 0 ? 'present' : 'not present'
      }.`,
      factors: {
        sector: normalizedSector,
        debtToEquity,
        netDebtToEbitda,
        interestCoverage,
        currentRatio,
        freeCashFlowTtm,
        methodology: 'financials_limited',
      },
    }
  }

  const components: number[] = []

  if (isNumber(debtToEquity)) {
    components.push(
      scoreMaxMetric(debtToEquity, [
        { max: 0.3, score: 10 },
        { max: 0.5, score: 9 },
        { max: 0.75, score: 8 },
        { max: 1, score: 7 },
        { max: 1.5, score: 5 },
        { max: 2, score: 3 },
      ])
    )
  }

  if (isNumber(netDebtToEbitda)) {
    components.push(
      scoreMaxMetric(netDebtToEbitda, [
        { max: 0.5, score: 10 },
        { max: 1, score: 9 },
        { max: 2, score: 8 },
        { max: 3, score: 7 },
        { max: 4, score: 5 },
        { max: 5, score: 3 },
      ])
    )
  }

  if (isNumber(interestCoverage)) {
    components.push(
      scoreMinMetric(interestCoverage, [
        { min: 20, score: 10 },
        { min: 12, score: 9 },
        { min: 8, score: 8 },
        { min: 5, score: 7 },
        { min: 3, score: 5 },
        { min: 2, score: 3 },
      ])
    )
  }

  if (isNumber(currentRatio)) {
    components.push(
      scoreMinMetric(currentRatio, [
        { min: 2, score: 10 },
        { min: 1.5, score: 9 },
        { min: 1.2, score: 8 },
        { min: 1.0, score: 6 },
        { min: 0.8, score: 4 },
        { min: 0.6, score: 2 },
      ])
    )
  }

  if (isNumber(freeCashFlowTtm)) {
    components.push(freeCashFlowTtm > 0 ? 9 : 2)
  }

  if (components.length === 0) {
    return {
      score: null,
      explanation: 'Financial health score could not be calculated because data is missing.',
      factors: {
        sector: normalizedSector,
        debtToEquity,
        netDebtToEbitda,
        interestCoverage,
        currentRatio,
        freeCashFlowTtm,
        methodology: 'standard',
      },
    }
  }

  const rawScore = components.reduce((sum, value) => sum + value, 0) / components.length
  const score = clampScore(rawScore)

  const parts: string[] = []
  if (isNumber(debtToEquity)) parts.push(`Debt/Equity ${debtToEquity.toFixed(2)}`)
  if (isNumber(netDebtToEbitda)) parts.push(`Net Debt/EBITDA ${netDebtToEbitda.toFixed(2)}x`)
  if (isNumber(interestCoverage))
    parts.push(`Interest Coverage ${interestCoverage.toFixed(2)}x`)
  if (isNumber(currentRatio)) parts.push(`Current Ratio ${currentRatio.toFixed(2)}`)
  if (isNumber(freeCashFlowTtm))
    parts.push(`Free Cash Flow ${freeCashFlowTtm > 0 ? 'positive' : 'negative'}`)

  return {
    score,
    explanation: `Financial health score is ${score.toFixed(
      1
    )}/10 using balance sheet and cash flow metrics based on ${parts.join(', ')}.`,
    factors: {
      sector: normalizedSector,
      debtToEquity,
      netDebtToEbitda,
      interestCoverage,
      currentRatio,
      freeCashFlowTtm,
      methodology: 'standard',
    },
  }
}