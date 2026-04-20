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

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT wrap the response in backticks.
Do NOT include citations, footnotes, links, source lists, or reference markers.
Do NOT include any text before or after the JSON.
Do NOT include bracketed references like [1], [Source], or URLs inside evidence fields.
Evidence must be plain text only.

Scoring rules:
- Each moat and management dimension must have:
  - "score": number from 0 to 2
  - "evidence": concise plain-text evidence
- confidence must be exactly one of: "High", "Medium", "Low"
- key_risks and red_flags must be arrays of strings
- summary fields must be plain strings
- If uncertain, still return valid JSON and use a lower score or lower confidence instead of adding commentary

Use this exact JSON shape and field names:

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

Additional constraints:
- Return a single JSON object only.
- No trailing commas.
- No comments.
- No markdown bullets.
- No explanatory notes.
- No citations or source attributions anywhere in the output.
- All evidence must be plain English sentences.

Focus on durable competitive advantage, management quality, governance, and execution discipline.${
    input.thesisNotes
      ? `

Optional context notes:
${input.thesisNotes}`
      : ''
  }`
}