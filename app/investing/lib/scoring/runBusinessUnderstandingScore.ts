export type BusinessUnderstandingDimension = {
  score: number
  evidence: string
}

export type BusinessUnderstandingPayload = {
  business_understanding: {
    business_model_clarity: BusinessUnderstandingDimension
    revenue_driver_clarity: BusinessUnderstandingDimension
    customer_clarity: BusinessUnderstandingDimension
    cost_structure_clarity: BusinessUnderstandingDimension
    competitive_landscape_clarity: BusinessUnderstandingDimension
    key_risk_clarity: BusinessUnderstandingDimension
    predictability: BusinessUnderstandingDimension
    evidence_quality: BusinessUnderstandingDimension
    red_flags: string[]
    summary: string
  }
  confidence: 'High' | 'Medium' | 'Low' | string
}

export type BusinessUnderstandingScoreResult = {
  score: number | null
  explanation: string
  normalizedPayload: BusinessUnderstandingPayload | null
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeDimension(value: unknown): BusinessUnderstandingDimension | null {
  if (!isObject(value)) return null

  const rawScore = typeof value.score === 'number' ? value.score : Number(value.score)
  const evidence = typeof value.evidence === 'string' ? value.evidence : ''

  if (!Number.isFinite(rawScore)) return null

  return {
    score: clamp(Math.round(rawScore), 0, 2),
    evidence,
  }
}

export function runBusinessUnderstandingScore(
  raw: unknown
): BusinessUnderstandingScoreResult {
  if (!isObject(raw)) {
    return {
      score: null,
      explanation: 'Business understanding score could not be calculated because the JSON payload is missing or invalid.',
      normalizedPayload: null,
    }
  }

  const bu = raw.business_understanding
  if (!isObject(bu)) {
    return {
      score: null,
      explanation: 'Business understanding score could not be calculated because business_understanding is missing.',
      normalizedPayload: null,
    }
  }

  const businessModel = normalizeDimension(bu.business_model_clarity)
  const revenueDrivers = normalizeDimension(bu.revenue_driver_clarity)
  const customer = normalizeDimension(bu.customer_clarity)
  const costStructure = normalizeDimension(bu.cost_structure_clarity)
  const competition = normalizeDimension(bu.competitive_landscape_clarity)
  const keyRisks = normalizeDimension(bu.key_risk_clarity)
  const predictability = normalizeDimension(bu.predictability)
  const evidenceQuality = normalizeDimension(bu.evidence_quality)

  const dimensions = [
    businessModel,
    revenueDrivers,
    customer,
    costStructure,
    competition,
    keyRisks,
    predictability,
    evidenceQuality,
  ]

  if (dimensions.some((item) => item == null)) {
    return {
      score: null,
      explanation:
        'Business understanding score could not be calculated because one or more required dimensions are missing or invalid.',
      normalizedPayload: null,
    }
  }

  const safeDimensions = dimensions as BusinessUnderstandingDimension[]
  const total = safeDimensions.reduce((sum, item) => sum + item.score, 0)
  const rawScore = (total / 16) * 10
  const score = Number(rawScore.toFixed(1))

  const normalizedPayload: BusinessUnderstandingPayload = {
    business_understanding: {
      business_model_clarity: businessModel!,
      revenue_driver_clarity: revenueDrivers!,
      customer_clarity: customer!,
      cost_structure_clarity: costStructure!,
      competitive_landscape_clarity: competition!,
      key_risk_clarity: keyRisks!,
      predictability: predictability!,
      evidence_quality: evidenceQuality!,
      red_flags: Array.isArray(bu.red_flags)
        ? bu.red_flags.filter((item): item is string => typeof item === "string")
        : [],
      summary: typeof bu.summary === 'string' ? bu.summary : '',
    },
    confidence:
      raw.confidence === 'High' || raw.confidence === 'Medium' || raw.confidence === 'Low'
        ? raw.confidence
        : 'Medium',
  }

  return {
    score,
    explanation: `Business understanding score is ${score.toFixed(
      1
    )}/10 based on 8 structured clarity factors across business model, revenue drivers, customers, costs, competition, risks, predictability, and evidence quality.`,
    normalizedPayload,
  }
}