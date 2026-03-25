// Server only — do not import in client components
// Massive (formerly Polygon.io) — provider v2
// Uses free-tier-compatible endpoints only:
//   - stocks.aggregates for price data (daily OHLCV)
//   - reference.tickerDetails for company info
//   - stocks.financials for EPS and revenue data
// Does NOT use snapshot endpoints — those require Starter plan or above

import { restClient } from 'https://esm.sh/@polygon.io/client-js@7'
import type {
  FundamentalsData,
  MarketDataProvider,
  MarketIndexData,
  PriceData,
} from './types.ts'

const apiKey = Deno.env.get('MASSIVE_API_KEY') ?? ''
const client = restClient(apiKey)

type AggregateBar = {
  c?: number | null
  v?: number | null
  t?: number | null
}

type AggregatesResponse = {
  results?: AggregateBar[] | null
}

type FinancialValueNode = {
  value?: number | null
}

type FinancialsRow = {
  financials?: {
    income_statement?: {
      basic_earnings_per_share?: FinancialValueNode | null
      revenues?: FinancialValueNode | null
    } | null
  } | null
}

type FinancialsResponse = {
  results?: FinancialsRow[] | null
}

function getRecentTradingDateRange(): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)
  const from = new Date(now)
  from.setDate(from.getDate() - 5)

  return {
    from: from.toISOString().slice(0, 10),
    to,
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function unwrapResponse<T>(value: unknown): T | null {
  if (!value) return null

  if (isRecord(value) && 'data' in value) {
    return (value.data as T | undefined) ?? null
  }

  return value as T
}

async function fetchPrice(ticker: string): Promise<PriceData | null> {
  try {
    const { from, to } = getRecentTradingDateRange()
    const rawResponse = await client.stocks.aggregates(ticker, 1, 'day', from, to)
    const response = unwrapResponse<AggregatesResponse>(rawResponse)

    if (!response?.results || response.results.length === 0) {
      console.error(`[massive] fetchPrice: no results for ${ticker}`)
      return null
    }

    const bars = [...response.results].sort((a, b) => (b.t ?? 0) - (a.t ?? 0))
    const latest = bars[0]

    if (!latest?.c || latest.c === 0) {
      console.error(`[massive] fetchPrice: close price missing for ${ticker}`)
      return null
    }

    return {
      ticker,
      price: latest.c,
      volume: latest.v ?? 0,
      averageVolume50d: 0, // not available on free tier
      fetchedAt: new Date().toISOString(),
      stale: false,
    }
  } catch (err) {
    console.error(`[massive] fetchPrice error for ${ticker}: ${getErrorMessage(err)}`)
    return null
  }
}

async function fetchFundamentals(ticker: string): Promise<FundamentalsData | null> {
  try {
    // tickerDetails is intentionally called even though we do not map fields from it yet.
    // It remains part of the free-tier-compatible reference flow and keeps the provider
    // aligned with the intended Massive integration shape.
    await client.reference.tickerDetails(ticker)

    const rawFinancialsResponse = await client.stocks.financials({
      ticker,
      limit: 2,
      timeframe: 'annual',
      order: 'desc',
    })

    const financialsResponse = unwrapResponse<FinancialsResponse>(rawFinancialsResponse)
    const results = financialsResponse?.results ?? []

    let epsGrowthPct: number | null = null
    let revenueGrowthPct: number | null = null

    if (results.length >= 2) {
      const currentEps =
        results[0]?.financials?.income_statement?.basic_earnings_per_share?.value ?? null
      const priorEps =
        results[1]?.financials?.income_statement?.basic_earnings_per_share?.value ?? null

      if (currentEps !== null && priorEps !== null && priorEps !== 0) {
        epsGrowthPct = Number(
          (((currentEps - priorEps) / Math.abs(priorEps)) * 100).toFixed(2)
        )
      }

      const currentRevenue =
        results[0]?.financials?.income_statement?.revenues?.value ?? null
      const priorRevenue =
        results[1]?.financials?.income_statement?.revenues?.value ?? null

      if (currentRevenue !== null && priorRevenue !== null && priorRevenue !== 0) {
        revenueGrowthPct = Number(
          (((currentRevenue - priorRevenue) / Math.abs(priorRevenue)) * 100).toFixed(2)
        )
      }
    }

    return {
      ticker,
      epsGrowthPct,
      revenueGrowthPct,
      accDistRating: null, // IBD-specific, not available via any API
      industryGroupRank: null, // IBD-specific, not available via any API
      epsAccelerating: null, // requires 3+ periods, set to null for now
      fetchedAt: new Date().toISOString(),
      stale: false,
    }
  } catch (err) {
    console.error(
      `[massive] fetchFundamentals error for ${ticker}: ${getErrorMessage(err)}`
    )

    // Return partial object rather than null — do not fail entirely on fundamentals error
    return {
      ticker,
      epsGrowthPct: null,
      revenueGrowthPct: null,
      accDistRating: null,
      industryGroupRank: null,
      epsAccelerating: null,
      fetchedAt: new Date().toISOString(),
      stale: true,
    }
  }
}

async function fetchMarketIndex(): Promise<MarketIndexData | null> {
  try {
    const { from, to } = getRecentTradingDateRange()

    const [rawSpyResponse, rawQqqResponse] = await Promise.all([
      client.stocks.aggregates('SPY', 1, 'day', from, to),
      client.stocks.aggregates('QQQ', 1, 'day', from, to),
    ])

    const spyResponse = unwrapResponse<AggregatesResponse>(rawSpyResponse)
    const qqqResponse = unwrapResponse<AggregatesResponse>(rawQqqResponse)

    const spyBars = [...(spyResponse?.results ?? [])].sort((a, b) => (b.t ?? 0) - (a.t ?? 0))
    const qqqBars = [...(qqqResponse?.results ?? [])].sort((a, b) => (b.t ?? 0) - (a.t ?? 0))

    const spyLatest = spyBars[0]
    const qqqLatest = qqqBars[0]

    if (!spyLatest?.c || spyLatest.c === 0) {
      console.error('[massive] fetchMarketIndex: SPY price missing — cannot determine market index')
      return null
    }

    return {
      spyPrice: spyLatest.c,
      spyVolume: spyLatest.v ?? 0,
      qqyPrice: qqqLatest?.c ?? 0,
      nasdaqPrice: qqqLatest?.c ?? 0, // QQQ used as NASDAQ proxy on free tier
      fetchedAt: new Date().toISOString(),
      stale: false,
    }
  } catch (err) {
    console.error('[massive] fetchMarketIndex error:', getErrorMessage(err))
    return null
  }
}

export const massiveProvider: MarketDataProvider = {
  fetchPrice,
  fetchFundamentals,
  fetchMarketIndex,
}