import type { QualitativeImportPayload } from './types'

function normalizeToTen(total: number, max: number): number {
  return Number(((total / max) * 10).toFixed(1))
}

export function scoreQualitativeImport(payload: QualitativeImportPayload) {
  const moatRaw =
    payload.moat.switching_costs.score +
    payload.moat.network_effects.score +
    payload.moat.brand_strength.score +
    payload.moat.cost_advantage.score +
    payload.moat.scale_advantage.score +
    payload.moat.moat_duration.score

  const managementRaw =
    payload.management.capital_allocation.score +
    payload.management.shareholder_alignment.score +
    payload.management.execution_consistency.score +
    payload.management.communication_quality.score +
    payload.management.credibility.score +
    payload.management.governance.score

  return {
    moatScoreAuto: normalizeToTen(moatRaw, 12),
    managementScoreAuto: normalizeToTen(managementRaw, 12),
  }
}