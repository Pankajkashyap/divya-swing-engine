import type { Sector } from '@/app/investing/types'

export type RoicScoreInput = {
  sector: Sector | string | null
  roicTtm: number | null
  roic5yAvg: number | null
  roeTtm: number | null
}

export type RoicScoreResult = {
  score: number | null
  explanation: string
  factors: {
    sector: string | null
    roicTtm: number | null
    roic5yAvg: number | null
    roeTtm: number | null
    methodology: 'roic_led' | 'roe_led'
  }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Number(value.toFixed(1))))
}

function isNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value)
}

function scoreFromBands(
  value: number,
  bands: Array<{ min: number; score: number }>
): number {
  for (const band of bands) {
    if (value >= band.min) return band.score
  }
  return 0
}

export function runRoicScore(input: RoicScoreInput): RoicScoreResult {
  const { sector, roicTtm, roic5yAvg, roeTtm } = input

  const normalizedSector = sector ?? null
  const isFinancial = normalizedSector === 'Financials'

  if (isFinancial) {
    if (!isNumber(roeTtm)) {
      return {
        score: null,
        explanation: 'ROIC score could not be calculated because ROE is missing for a Financials company.',
        factors: {
          sector: normalizedSector,
          roicTtm,
          roic5yAvg,
          roeTtm,
          methodology: 'roe_led',
        },
      }
    }

    const score = scoreFromBands(roeTtm, [
      { min: 24, score: 10 },
      { min: 20, score: 9 },
      { min: 17, score: 8 },
      { min: 14, score: 7 },
      { min: 12, score: 6 },
      { min: 10, score: 5 },
      { min: 8, score: 4 },
      { min: 6, score: 3 },
      { min: 4, score: 2 },
      { min: 2, score: 1 },
    ])

    return {
      score,
      explanation: `ROIC score is ${score.toFixed(
        1
      )}/10 using ROE-led logic for Financials. ROE is ${roeTtm.toFixed(1)}%.`,
      factors: {
        sector: normalizedSector,
        roicTtm,
        roic5yAvg,
        roeTtm,
        methodology: 'roe_led',
      },
    }
  }

  const components: number[] = []

  if (isNumber(roicTtm)) {
    components.push(
      scoreFromBands(roicTtm, [
        { min: 30, score: 10 },
        { min: 25, score: 9.5 },
        { min: 20, score: 9 },
        { min: 18, score: 8.5 },
        { min: 15, score: 8 },
        { min: 12, score: 7 },
        { min: 10, score: 6 },
        { min: 8, score: 5 },
        { min: 6, score: 4 },
        { min: 4, score: 3 },
        { min: 2, score: 2 },
      ])
    )
  }

  if (isNumber(roic5yAvg)) {
    components.push(
      scoreFromBands(roic5yAvg, [
        { min: 25, score: 10 },
        { min: 20, score: 9 },
        { min: 18, score: 8.5 },
        { min: 15, score: 8 },
        { min: 12, score: 7 },
        { min: 10, score: 6 },
        { min: 8, score: 5 },
        { min: 6, score: 4 },
        { min: 4, score: 3 },
        { min: 2, score: 2 },
      ])
    )
  }

  if (components.length === 0) {
    return {
      score: null,
      explanation: 'ROIC score could not be calculated because ROIC data is missing.',
      factors: {
        sector: normalizedSector,
        roicTtm,
        roic5yAvg,
        roeTtm,
        methodology: 'roic_led',
      },
    }
  }

  const rawScore = components.reduce((sum, value) => sum + value, 0) / components.length
  const score = clampScore(rawScore)

  const parts: string[] = []
  if (isNumber(roicTtm)) parts.push(`ROIC TTM ${roicTtm.toFixed(1)}%`)
  if (isNumber(roic5yAvg)) parts.push(`ROIC 5Y avg ${roic5yAvg.toFixed(1)}%`)

  return {
    score,
    explanation: `ROIC score is ${score.toFixed(
      1
    )}/10 using ROIC-led logic based on ${parts.join(' and ')}.`,
    factors: {
      sector: normalizedSector,
      roicTtm,
      roic5yAvg,
      roeTtm,
      methodology: 'roic_led',
    },
  }
}