export type ConfidenceLabel = 'High' | 'Medium' | 'Low'

export type QualitativeDimension = {
  score: number
  evidence: string
}

export type MoatBlock = {
  switching_costs: QualitativeDimension
  network_effects: QualitativeDimension
  brand_strength: QualitativeDimension
  cost_advantage: QualitativeDimension
  scale_advantage: QualitativeDimension
  moat_duration: QualitativeDimension
  key_risks: string[]
  summary: string
}

export type ManagementBlock = {
  capital_allocation: QualitativeDimension
  shareholder_alignment: QualitativeDimension
  execution_consistency: QualitativeDimension
  communication_quality: QualitativeDimension
  credibility: QualitativeDimension
  governance: QualitativeDimension
  red_flags: string[]
  summary: string
}

export type QualitativeImportPayload = {
  moat: MoatBlock
  management: ManagementBlock
  confidence: ConfidenceLabel
}