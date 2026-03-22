// Server only — do not import in client components

import type { FundamentalsData, PriceData } from './types.ts'

type YahooQuoteLike = {
  regularMarketPrice?: number | null
  regularMarketVolume?: number | null
  averageDailyVolume50Day?: number | null
}

type YahooSummaryLike = {
  financialData?: {
    earningsGrowth?: number | null
    revenueGrowth?: number | null
  } | null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function mapQuoteToPrice(
  ticker: string,
  quote: YahooQuoteLike
): PriceData | null {
  const price = readNumber(quote.regularMarketPrice)
  const volume = readNumber(quote.regularMarketVolume)

  if (price == null || volume == null) {
    return null
  }

  const averageVolume50d = readNumber(quote.averageDailyVolume50Day) ?? 0

  return {
    ticker,
    price,
    volume,
    averageVolume50d,
    fetchedAt: new Date().toISOString(),
    stale: false,
  }
}

export function mapSummaryToFundamentals(
  ticker: string,
  summary: YahooSummaryLike
): FundamentalsData {
  const earningsGrowthRaw = readNumber(summary.financialData?.earningsGrowth)
  const revenueGrowthRaw = readNumber(summary.financialData?.revenueGrowth)

  return {
    ticker,
    epsGrowthPct:
      earningsGrowthRaw == null ? null : Number((earningsGrowthRaw * 100).toFixed(2)),
    revenueGrowthPct:
      revenueGrowthRaw == null ? null : Number((revenueGrowthRaw * 100).toFixed(2)),
    accDistRating: null,
    industryGroupRank: null,
    epsAccelerating: null,
    fetchedAt: new Date().toISOString(),
    stale: false,
  }
}