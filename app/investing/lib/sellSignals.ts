export type SellSignalSeverity = 'critical' | 'warning' | 'info'

export type SellSignal = {
  ticker: string
  company: string
  signalType: string
  severity: SellSignalSeverity
  title: string
  explanation: string
  suggestedAction: 'Sell' | 'Trim' | 'Review' | 'Monitor'
  currentValue: number | null
  gainLossPct: number | null
}

export type SellSignalInput = {
  ticker: string
  company: string
  shares: number
  avgCost: number
  currentPrice: number
  marketValue: number | null
  gainLossPct: number | null
  sector: string
  bucket: string | null
  thesisStatus: string | null
  latestVerdict: string | null
  latestConfidence: string | null
  fairValueLow: number | null
  fairValueHigh: number | null
  positionWeightPct: number
  sectorWeightPct: number
  sectorTargetMaxPct: number | null
  bucketWeightPct: number
  bucketTargetMaxPct: number | null
}

export function evaluateSellSignals(holding: SellSignalInput): SellSignal[] {
  const signals: SellSignal[] = []
  const base = {
    ticker: holding.ticker,
    company: holding.company,
    currentValue: holding.marketValue,
    gainLossPct: holding.gainLossPct,
  }

  if (holding.thesisStatus === 'Broken') {
    signals.push({
      ...base,
      signalType: 'thesis_broken',
      severity: 'critical',
      title: 'Thesis broken',
      explanation: `Investment thesis for ${holding.ticker} has been marked as broken. This is the strongest sell signal — the original reason for owning the stock no longer holds.`,
      suggestedAction: 'Sell',
    })
  }

  if (holding.thesisStatus === 'Weakening') {
    signals.push({
      ...base,
      signalType: 'thesis_weakening',
      severity: 'warning',
      title: 'Thesis weakening',
      explanation: `Investment thesis for ${holding.ticker} is weakening. Review the original thesis and determine if the deterioration is temporary or structural.`,
      suggestedAction: 'Review',
    })
  }

  if (
    holding.fairValueHigh != null &&
    holding.fairValueHigh > 0 &&
    holding.currentPrice > holding.fairValueHigh * 1.2
  ) {
    const overshootPct = (
      ((holding.currentPrice - holding.fairValueHigh) / holding.fairValueHigh) *
      100
    ).toFixed(1)

    signals.push({
      ...base,
      signalType: 'significantly_overvalued',
      severity: 'warning',
      title: 'Significantly overvalued',
      explanation: `${holding.ticker} is trading ${overshootPct}% above fair value high ($${holding.fairValueHigh.toFixed(2)}). Consider trimming to lock in gains.`,
      suggestedAction: 'Trim',
    })
  }

  if (holding.positionWeightPct > 10) {
    signals.push({
      ...base,
      signalType: 'position_overweight',
      severity: 'warning',
      title: 'Position overweight',
      explanation: `${holding.ticker} is ${holding.positionWeightPct.toFixed(1)}% of portfolio, exceeding the 10% maximum. Trim to reduce concentration risk.`,
      suggestedAction: 'Trim',
    })
  }

  if (
    holding.sectorTargetMaxPct != null &&
    holding.sectorWeightPct > holding.sectorTargetMaxPct
  ) {
    signals.push({
      ...base,
      signalType: 'sector_overweight',
      severity: 'warning',
      title: `Sector overweight (${holding.sector})`,
      explanation: `${holding.sector} sector is at ${holding.sectorWeightPct.toFixed(1)}% vs max target of ${holding.sectorTargetMaxPct}%. Consider trimming ${holding.ticker} or other ${holding.sector} holdings.`,
      suggestedAction: 'Trim',
    })
  }

  if (
    holding.bucket &&
    holding.bucketTargetMaxPct != null &&
    holding.bucketWeightPct > holding.bucketTargetMaxPct
  ) {
    signals.push({
      ...base,
      signalType: 'bucket_overweight',
      severity: 'warning',
      title: `Bucket overweight (${holding.bucket})`,
      explanation: `${holding.bucket} bucket is at ${holding.bucketWeightPct.toFixed(1)}% vs max target of ${holding.bucketTargetMaxPct}%. Consider rebalancing.`,
      suggestedAction: 'Trim',
    })
  }

  if (holding.latestVerdict === 'Avoid' || holding.latestVerdict === 'Red Flag') {
    signals.push({
      ...base,
      signalType: 'negative_verdict',
      severity: 'warning',
      title: `Negative verdict: ${holding.latestVerdict}`,
      explanation: `Latest analysis verdict for ${holding.ticker} is "${holding.latestVerdict}". Review whether conditions have changed since purchase.`,
      suggestedAction: 'Review',
    })
  }

  if (
    holding.fairValueHigh != null &&
    holding.fairValueHigh > 0 &&
    holding.currentPrice > holding.fairValueHigh &&
    holding.currentPrice <= holding.fairValueHigh * 1.2
  ) {
    signals.push({
      ...base,
      signalType: 'moderately_overvalued',
      severity: 'info',
      title: 'Above fair value',
      explanation: `${holding.ticker} is trading above the fair value high of $${holding.fairValueHigh.toFixed(2)}. Not yet at trim level but worth monitoring.`,
      suggestedAction: 'Monitor',
    })
  }

  if (holding.gainLossPct != null && holding.gainLossPct > 100) {
    signals.push({
      ...base,
      signalType: 'large_gain',
      severity: 'info',
      title: 'Large unrealized gain',
      explanation: `${holding.ticker} has a ${holding.gainLossPct.toFixed(1)}% unrealized gain. Consider whether the position size still aligns with conviction level.`,
      suggestedAction: 'Monitor',
    })
  }

  return signals
}

export function runAllSellSignals(holdings: SellSignalInput[]): SellSignal[] {
  const allSignals: SellSignal[] = []

  for (const holding of holdings) {
    if (holding.bucket === 'TFSA Cash' || holding.bucket === 'Non-registered Cash') {
      continue
    }

    allSignals.push(...evaluateSellSignals(holding))
  }

  const severityOrder: Record<SellSignalSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }

  return allSignals.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  )
}