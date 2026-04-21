export type SectorKey =
  | 'Technology'
  | 'Consumer Staples'
  | 'Consumer Discretionary'
  | 'Financials'
  | 'Healthcare'
  | 'Industrials'
  | 'Energy'
  | 'Communication Services'
  | 'Real Estate'
  | 'Utilities'
  | 'Materials'
  | 'Unknown'

export type InvestingSnapshot = {
  ticker: string
  company: string
  sector: SectorKey
  currentPrice: number | null
  marketCap: number | null
  isUsListed: boolean | null

  roicTtm: number | null
  roic5yAvg: number | null
  roeTtm: number | null

  grossMarginTtm: number | null
  operatingMarginTtm: number | null
  fcfMarginTtm: number | null

  evToEbitTtm: number | null
  earningsYieldTtm: number | null
  forwardPe: number | null
  pegRatio: number | null
  priceToFcfTtm: number | null
  priceToBook: number | null

  debtToEquity: number | null
  netDebtToEbitda: number | null
  interestCoverage: number | null
  currentRatio: number | null

  revenueGrowth3yCagr: number | null
  epsGrowth3yCagr: number | null
  fcfGrowth3yCagr: number | null

  freeCashFlowTtm: number | null
  revenueTtm: number | null
  ebitTtm: number | null
  ebitdaTtm: number | null
  netIncomeTtm: number | null

  yearsPositiveEarnings: number | null

  revenueTrend3yDeclining: boolean | null
  negativeFcfYearsLast2: boolean | null
  fcfConversion3yAvg: number | null
  goodwillToAssets: number | null
  marginDeterioration3y: boolean | null

  fairValueLow: number | null
  fairValueBase: number | null
  fairValueHigh: number | null
  fairValueValidMethodCount: number | null
}

export type ScreenerThresholds = {
  roicTtmMin: number | null
  roic5yAvgMin: number | null
  roeTtmMin: number | null

  grossMarginMin: number | null
  operatingMarginMin: number | null
  fcfMarginMin: number | null

  evToEbitMax: number | null
  earningsYieldMin: number | null
  forwardPeMax: number | null
  pegRatioMax: number | null
  priceToFcfMax: number | null
  priceToBookMax: number | null

  debtToEquityMax: number | null
  netDebtToEbitdaMax: number | null
  interestCoverageMin: number | null
  currentRatioMin: number | null
  freeCashFlowPositiveRequired: boolean

  revenueGrowth3yCagrMin: number | null
  epsGrowth3yCagrMin: number | null
  fcfGrowth3yCagrMin: number | null

  marketCapMin: number | null
  yearsPositiveEarningsMin: number | null
  requiresUsListing: boolean
}

export type ScreenerRuleResult = {
  id: string
  label: string
  metric: string
  thresholdText: string
  actualValueText: string
  status: 'pass' | 'fail' | 'inconclusive'
  explanation: string
}

export type RedFlagResult = {
  id: string
  label: string
  triggered: boolean
  severity: 'warning' | 'critical'
  explanation: string
}

export type ScreenerEngineResult = {
  snapshot: InvestingSnapshot
  thresholds: ScreenerThresholds
  rules: ScreenerRuleResult[]
  redFlags: RedFlagResult[]
  passedRules: number
  failedRules: number
  inconclusiveRules: number
  criticalRedFlags: number
  passedInitialScreen: boolean
  scorecard?: QuantitativeScorecardResult
  verdict?: VerdictResult
    valuationDebug?: {
    dcf: {
      low: number | null
      base: number | null
      high: number | null
    }
    ownerEarnings: {
      low: number | null
      base: number | null
      high: number | null
    }
    comparables: {
      low: number | null
      base: number | null
      high: number | null
    }
    range: {
      fairValueLow: number | null
      fairValueBase: number | null
      fairValueHigh: number | null
      validMethodCount: number
    }
  }
}

export type ScorecardCategoryScore = {
  id: 'valuation' | 'quality' | 'financialHealth' | 'growth'
  label: string
  score: number
  maxScore: number
  passed: number
  failed: number
  inconclusive: number
  explanation: string
}

export type QuantitativeScorecardResult = {
  categories: ScorecardCategoryScore[]
  overallScore: number
  maxScore: number
}

export type VerdictLabel = 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid' | 'Red Flag'

export type VerdictResult = {
  label: VerdictLabel
  explanation: string
  overallScore: number
  criticalRedFlags: number
  warningRedFlags: number
}