// Server only — do not import in client components

import YahooFinance from 'npm:yahoo-finance2'
import { mapQuoteToPrice, mapSummaryToFundamentals } from './mapper.ts'
import type {
  FundamentalsData,
  MarketDataProvider,
  MarketIndexData,
  PriceData,
} from './types.ts'

const yahooFinance = new YahooFinance()

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

async function fetchQuoteSafe(ticker: string): Promise<YahooQuoteLike | null> {
  try {
    return (await yahooFinance.quote(ticker)) as YahooQuoteLike
  } catch (error) {
    console.error(`[yahooProvider.fetchQuoteSafe] ${ticker}: ${getErrorMessage(error)}`)
    return null
  }
}

async function fetchPrice(ticker: string): Promise<PriceData | null> {
  try {
    const quote = (await yahooFinance.quote(ticker)) as YahooQuoteLike
    const mapped = mapQuoteToPrice(ticker, quote)

    if (!mapped) {
      console.error(
        `[yahooProvider.fetchPrice] ${ticker}: missing required quote fields`
      )
      return null
    }

    return mapped
  } catch (error) {
    console.error(`[yahooProvider.fetchPrice] ${ticker}: ${getErrorMessage(error)}`)
    return null
  }
}

async function fetchFundamentals(ticker: string): Promise<FundamentalsData | null> {
  try {
    const summary = (await yahooFinance.quoteSummary(ticker, {
      modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail'],
    })) as YahooSummaryLike

    return mapSummaryToFundamentals(ticker, summary)
  } catch (error) {
    console.error(
      `[yahooProvider.fetchFundamentals] ${ticker}: ${getErrorMessage(error)}`
    )
    return null
  }
}

async function fetchMarketIndex(): Promise<MarketIndexData | null> {
  try {
    const [spyQuote, qqqQuote, nasdaqQuote] = await Promise.all([
      fetchQuoteSafe('SPY'),
      fetchQuoteSafe('QQQ'),
      fetchQuoteSafe('^IXIC'),
    ])

    const spyPrice =
      typeof spyQuote?.regularMarketPrice === 'number'
        ? spyQuote.regularMarketPrice
        : null
    const spyVolume =
      typeof spyQuote?.regularMarketVolume === 'number'
        ? spyQuote.regularMarketVolume
        : null
    const qqqPrice =
      typeof qqqQuote?.regularMarketPrice === 'number'
        ? qqqQuote.regularMarketPrice
        : null
    const nasdaqPrice =
      typeof nasdaqQuote?.regularMarketPrice === 'number'
        ? nasdaqQuote.regularMarketPrice
        : null

    if (spyPrice == null) {
      console.error('[yahooProvider.fetchMarketIndex] SPY price missing')
      return null
    }

    if (spyVolume == null) {
      console.error('[yahooProvider.fetchMarketIndex] SPY volume missing')
      return null
    }

    if (qqqPrice == null) {
      console.error('[yahooProvider.fetchMarketIndex] QQQ price missing')
      return null
    }

    if (nasdaqPrice == null) {
      console.error('[yahooProvider.fetchMarketIndex] ^IXIC price missing')
      return null
    }

    return {
      spyPrice,
      spyVolume,
      qqyPrice: qqqPrice,
      nasdaqPrice,
      fetchedAt: new Date().toISOString(),
      stale: false,
    }
  } catch (error) {
    console.error(`[yahooProvider.fetchMarketIndex] ${getErrorMessage(error)}`)
    return null
  }
}

export const yahooProvider: MarketDataProvider = {
  fetchPrice,
  fetchFundamentals,
  fetchMarketIndex,
}