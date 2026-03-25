// Server only — do not import in client components

import { massiveProvider } from './massive.ts'
import type { MarketDataProvider } from './types.ts'

export const marketDataProvider: MarketDataProvider = massiveProvider

export type {
  MarketDataProvider,
  PriceData,
  FundamentalsData,
  MarketIndexData,
  ProviderResult,
} from './types.ts'