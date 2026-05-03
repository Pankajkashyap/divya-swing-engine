type ThesisPromptInputs = {
  ticker: string
  company: string
  sector: string | null
  valuationScore: number | null
  roicScore: number | null
  finHealthScore: number | null
  growthScore: number | null
  overallEngineScore: number | null
  verdict: string | null
  fairValueLow: number | null
  fairValueHigh: number | null
  currentPrice: number | null
  redFlagsSummary: string | null
  moatScore: number | null
  managementScore: number | null
  moatSummary: string | null
  managementSummary: string | null
  bizUnderstandingLevel: string | null
}

export function buildThesisPrompt(input: ThesisPromptInputs): string {
  const lines: string[] = []

  lines.push(
    `You are writing an investment thesis for ${input.company} (${input.ticker})${
      input.sector ? ` in the ${input.sector} sector` : ''
    }.`
  )
  lines.push('')
  lines.push('Here is the complete analysis data:')
  lines.push('')

  lines.push('ENGINE SCORES:')
  if (input.overallEngineScore != null) {
    lines.push(`- Overall engine score: ${input.overallEngineScore.toFixed(1)}/10`)
  }
  if (input.verdict) {
    lines.push(`- Engine verdict: ${input.verdict}`)
  }
  if (input.valuationScore != null) {
    lines.push(`- Valuation: ${input.valuationScore.toFixed(1)}/10`)
  }
  if (input.roicScore != null) {
    lines.push(`- ROIC/Quality: ${input.roicScore.toFixed(1)}/10`)
  }
  if (input.finHealthScore != null) {
    lines.push(`- Financial Health: ${input.finHealthScore.toFixed(1)}/10`)
  }
  if (input.growthScore != null) {
    lines.push(`- Growth: ${input.growthScore.toFixed(1)}/10`)
  }
  lines.push('')

  if (input.fairValueLow != null && input.fairValueHigh != null) {
    lines.push('VALUATION:')
    lines.push(`- Fair value range: $${input.fairValueLow.toFixed(0)}–$${input.fairValueHigh.toFixed(0)}`)
    if (input.currentPrice != null) {
      lines.push(`- Current price: $${input.currentPrice.toFixed(2)}`)
      const midpoint = (input.fairValueLow + input.fairValueHigh) / 2
      const discount =
        midpoint > 0 ? ((midpoint - input.currentPrice) / midpoint) * 100 : null
      if (discount != null) {
        lines.push(`- Discount to fair value midpoint: ${discount.toFixed(1)}%`)
      }
    }
    lines.push('')
  }

  if (input.redFlagsSummary) {
    lines.push(`RED FLAGS: ${input.redFlagsSummary}`)
    lines.push('')
  } else {
    lines.push('RED FLAGS: None')
    lines.push('')
  }

  if (input.moatScore != null || input.managementScore != null) {
    lines.push('QUALITATIVE ANALYSIS:')
    if (input.moatScore != null) {
      lines.push(`- Moat score: ${input.moatScore.toFixed(1)}/10`)
    }
    if (input.moatSummary) {
      lines.push(`- Moat summary: ${input.moatSummary}`)
    }
    if (input.managementScore != null) {
      lines.push(`- Management score: ${input.managementScore.toFixed(1)}/10`)
    }
    if (input.managementSummary) {
      lines.push(`- Management summary: ${input.managementSummary}`)
    }
    lines.push('')
  }

  if (input.bizUnderstandingLevel) {
    lines.push(`BUSINESS UNDERSTANDING: ${input.bizUnderstandingLevel}`)
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push('Based on ALL the data above, generate an investment thesis and thesis breakers.')
  lines.push('')
  lines.push('Return ONLY valid JSON. Do NOT use markdown. Do NOT wrap in backticks.')
  lines.push('')
  lines.push('Use this exact JSON shape:')
  lines.push('{')
  lines.push(
    '  "thesis": "A 2-4 sentence investment thesis explaining WHY this stock could be a good investment. Focus on the specific edge or mispricing. Be direct and specific — not generic. Reference the actual data (moat strength, growth trajectory, valuation gap, management quality). If the stock is overvalued or has significant issues, the thesis should acknowledge this honestly.",'
  )
  lines.push(
    '  "thesis_breakers": "A 2-4 sentence description of what would make you sell or invalidate the thesis. Include specific, measurable conditions (e.g., ROIC drops below X%, revenue declines for Y quarters, key product loses market share). Reference actual risks identified in the red flags and qualitative analysis.",'
  )
  lines.push(
    '  "bear_case": "A 2-3 sentence bear case — the strongest argument AGAINST this investment. What could go seriously wrong? Be specific and honest.",'
  )
  lines.push('  "time_horizon": "Medium-term" or "Long-term"')
  lines.push('}')
  lines.push('')
  lines.push('Rules:')
  lines.push('- thesis must be specific to THIS company, not generic')
  lines.push('- thesis_breakers must include measurable conditions')
  lines.push('- bear_case must be the strongest honest counter-argument')
  lines.push('- time_horizon should be "Medium-term" (1-3 years) or "Long-term" (3-10+ years)')
  lines.push(
    '- If the stock is clearly overvalued (valuation score < 3), the thesis should focus on quality and waiting for better entry, not buying now'
  )
  lines.push('- Do not include citations, URLs, or source references')

  return lines.join('\n')
}