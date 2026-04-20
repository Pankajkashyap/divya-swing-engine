import type {
  ConfidenceLabel,
  QualitativeDimension,
  QualitativeImportPayload,
} from './types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string.`)
  }
  return value.trim()
}

function parseStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${field} must be an array of strings.`)
  }
  return value.map((item) => item.trim()).filter(Boolean)
}

function parseScore(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field}.score must be a valid number.`)
  }
  if (value < 0 || value > 2) {
    throw new Error(`${field}.score must be between 0 and 2.`)
  }
  return value
}

function parseDimension(value: unknown, field: string): QualitativeDimension {
  if (!isObject(value)) {
    throw new Error(`${field} must be an object.`)
  }

  return {
    score: parseScore(value.score, field),
    evidence: parseString(value.evidence, `${field}.evidence`),
  }
}

function parseConfidence(value: unknown): ConfidenceLabel {
  if (value === 'High' || value === 'Medium' || value === 'Low') {
    return value
  }
  throw new Error(`confidence must be one of: High, Medium, Low.`)
}

export function parseQualitativeImport(rawText: string): QualitativeImportPayload {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('Invalid JSON. Paste a valid JSON object.')
  }

  if (!isObject(parsed)) {
    throw new Error('Top-level payload must be an object.')
  }

  if (!isObject(parsed.moat)) {
    throw new Error('moat must be an object.')
  }

  if (!isObject(parsed.management)) {
    throw new Error('management must be an object.')
  }

  return {
    moat: {
      switching_costs: parseDimension(parsed.moat.switching_costs, 'moat.switching_costs'),
      network_effects: parseDimension(parsed.moat.network_effects, 'moat.network_effects'),
      brand_strength: parseDimension(parsed.moat.brand_strength, 'moat.brand_strength'),
      cost_advantage: parseDimension(parsed.moat.cost_advantage, 'moat.cost_advantage'),
      scale_advantage: parseDimension(parsed.moat.scale_advantage, 'moat.scale_advantage'),
      moat_duration: parseDimension(parsed.moat.moat_duration, 'moat.moat_duration'),
      key_risks: parseStringArray(parsed.moat.key_risks, 'moat.key_risks'),
      summary: parseString(parsed.moat.summary, 'moat.summary'),
    },
    management: {
      capital_allocation: parseDimension(
        parsed.management.capital_allocation,
        'management.capital_allocation'
      ),
      shareholder_alignment: parseDimension(
        parsed.management.shareholder_alignment,
        'management.shareholder_alignment'
      ),
      execution_consistency: parseDimension(
        parsed.management.execution_consistency,
        'management.execution_consistency'
      ),
      communication_quality: parseDimension(
        parsed.management.communication_quality,
        'management.communication_quality'
      ),
      credibility: parseDimension(parsed.management.credibility, 'management.credibility'),
      governance: parseDimension(parsed.management.governance, 'management.governance'),
      red_flags: parseStringArray(parsed.management.red_flags, 'management.red_flags'),
      summary: parseString(parsed.management.summary, 'management.summary'),
    },
    confidence: parseConfidence(parsed.confidence),
  }
}