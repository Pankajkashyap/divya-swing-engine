type PromptInputs = {
  ticker: string
  company: string
  sector?: string | null
  thesisNotes?: string | null
}

export function buildMoatManagementPrompt(input: PromptInputs) {
  return `You are evaluating ${input.company} (${input.ticker})${
    input.sector ? ` in the ${input.sector} sector` : ''
  }.

Return ONLY valid JSON. No markdown. No explanation outside JSON.

Scoring rules:
- Each moat and management dimension must have:
  - "score": number from 0 to 2
  - "evidence": concise evidence-based explanation
- confidence must be one of: "High", "Medium", "Low"
- key_risks and red_flags must be arrays of strings

Use this exact JSON shape:

{
  "moat": {
    "switching_costs": { "score": 0, "evidence": "" },
    "network_effects": { "score": 0, "evidence": "" },
    "brand_strength": { "score": 0, "evidence": "" },
    "cost_advantage": { "score": 0, "evidence": "" },
    "scale_advantage": { "score": 0, "evidence": "" },
    "moat_duration": { "score": 0, "evidence": "" },
    "key_risks": [],
    "summary": ""
  },
  "management": {
    "capital_allocation": { "score": 0, "evidence": "" },
    "shareholder_alignment": { "score": 0, "evidence": "" },
    "execution_consistency": { "score": 0, "evidence": "" },
    "communication_quality": { "score": 0, "evidence": "" },
    "credibility": { "score": 0, "evidence": "" },
    "governance": { "score": 0, "evidence": "" },
    "red_flags": [],
    "summary": ""
  },
  "confidence": "Medium"
}

Focus on durable advantage, management quality, and evidence. Keep evidence concise but specific.${
    input.thesisNotes ? `

Context notes:
${input.thesisNotes}` : ''
  }`
}