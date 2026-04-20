import type { ScreenerThresholds, SectorKey } from './types'

const DEFAULT_THRESHOLDS: ScreenerThresholds = {
  roicTtmMin: 15,
  roic5yAvgMin: 12,
  roeTtmMin: 15,

  grossMarginMin: 30,
  operatingMarginMin: 12,
  fcfMarginMin: 8,

  evToEbitMax: 20,
  earningsYieldMin: 5,
  forwardPeMax: 25,
  pegRatioMax: 2,
  priceToFcfMax: 20,
  priceToBookMax: null,

  debtToEquityMax: 1,
  netDebtToEbitdaMax: 3,
  interestCoverageMin: 5,
  currentRatioMin: 1.2,
  freeCashFlowPositiveRequired: true,

  revenueGrowth3yCagrMin: 5,
  epsGrowth3yCagrMin: 7,
  fcfGrowth3yCagrMin: 5,

  marketCapMin: 1_000_000_000,
  yearsPositiveEarningsMin: 5,
  requiresUsListing: true,
}

const SECTOR_OVERRIDES: Partial<Record<SectorKey, Partial<ScreenerThresholds>>> = {
  Technology: {
    grossMarginMin: 60,
    operatingMarginMin: 20,
    revenueGrowth3yCagrMin: 10,
    evToEbitMax: 30,
  },

  'Consumer Staples': {
    grossMarginMin: 35,
    operatingMarginMin: 15,
    revenueGrowth3yCagrMin: 3,
    evToEbitMax: 18,
  },

  Financials: {
    roicTtmMin: null,
    roic5yAvgMin: null,
    roeTtmMin: 12,

    grossMarginMin: null,
    operatingMarginMin: null,
    fcfMarginMin: null,

    evToEbitMax: null,
    earningsYieldMin: null,
    forwardPeMax: 14,
    pegRatioMax: null,
    priceToFcfMax: null,
    priceToBookMax: 2,

    debtToEquityMax: null,
    netDebtToEbitdaMax: null,
    interestCoverageMin: null,
    currentRatioMin: null,
    freeCashFlowPositiveRequired: false,
  },

  Healthcare: {
    grossMarginMin: 55,
    revenueGrowth3yCagrMin: 5,
  },

  Industrials: {
    grossMarginMin: 25,
    operatingMarginMin: 10,
    revenueGrowth3yCagrMin: 4,
    debtToEquityMax: 1.5,
  },

  Energy: {
    grossMarginMin: null,
    operatingMarginMin: null,
    fcfMarginMin: null,

    evToEbitMax: null,
    earningsYieldMin: null,
    forwardPeMax: null,
    pegRatioMax: null,
    priceToFcfMax: null,
    priceToBookMax: null,

    debtToEquityMax: 0.8,
  },

  'Real Estate': {
    roicTtmMin: null,
    roic5yAvgMin: null,
    roeTtmMin: null,

    grossMarginMin: null,
    operatingMarginMin: null,
    fcfMarginMin: null,

    evToEbitMax: null,
    earningsYieldMin: null,
    forwardPeMax: null,
    pegRatioMax: null,
    priceToFcfMax: null,
    priceToBookMax: null,

    debtToEquityMax: null,
    netDebtToEbitdaMax: null,
    interestCoverageMin: null,
    currentRatioMin: null,
  },
}

export function getScreenerThresholds(sector: SectorKey): ScreenerThresholds {
  return {
    ...DEFAULT_THRESHOLDS,
    ...(SECTOR_OVERRIDES[sector] ?? {}),
  }
}