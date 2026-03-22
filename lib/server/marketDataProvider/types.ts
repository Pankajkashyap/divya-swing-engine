export type PriceData = {
  ticker: string
  price: number
  volume: number
  averageVolume50d: number
  fetchedAt: string
  stale: boolean
}

export type FundamentalsData = {
  ticker: string
  epsGrowthPct: number | null
  revenueGrowthPct: number | null
  accDistRating: string | null
  industryGroupRank: number | null
  epsAccelerating: boolean | null
  fetchedAt: string
  stale: boolean
}

export type MarketIndexData = {
  spyPrice: number
  spyVolume: number
  qqyPrice: number
  nasdaqPrice: number
  fetchedAt: string
  stale: boolean
}

export type MarketDataProvider = {
  fetchPrice(ticker: string): Promise<PriceData | null>
  fetchFundamentals(ticker: string): Promise<FundamentalsData | null>
  fetchMarketIndex(): Promise<MarketIndexData | null>
}

export type ProviderResult<T> = {
  data: T | null
  error: string | null
  stale: boolean
}