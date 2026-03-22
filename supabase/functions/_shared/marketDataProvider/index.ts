// Server only — do not import in client components

import { yahooProvider } from './yahoo.ts'
import type { MarketDataProvider } from './types.ts'

export const marketDataProvider: MarketDataProvider = yahooProvider

export type {
  MarketDataProvider,
  PriceData,
  FundamentalsData,
  MarketIndexData,
  ProviderResult,
} from './types.ts'