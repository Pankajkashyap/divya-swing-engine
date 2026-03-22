import { yahooProvider } from './yahoo'
import type { MarketDataProvider } from './types'

export const marketDataProvider: MarketDataProvider = yahooProvider

export type {
  MarketDataProvider,
  PriceData,
  FundamentalsData,
  MarketIndexData,
  ProviderResult,
} from './types'