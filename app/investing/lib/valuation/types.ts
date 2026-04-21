export type RangeValuation = {
  low: number | null
  base: number | null
  high: number | null
}

export type FairValueRangeResult = {
  fairValueLow: number | null
  fairValueBase: number | null
  fairValueHigh: number | null
  validMethodCount: number
}

export type FairValueSnapshot = {
  ticker: string
  sector: string | null
  currentPrice: number | null
  freeCashFlowTtm: number | null
  operatingCashFlowTtm: number | null
  ebitTtm: number | null
  epsTtm: number | null
  bookValuePerShareTtm: number | null
  dilutedSharesOutstanding: number | null
  netDebt: number | null
  historicalFcfCagr3y: number | null
}