import { fmpFetch } from '@/app/investing/lib/fmp'
import type { InvestingSnapshot, SectorKey } from './types'

type FmpProfile = {
  symbol?: string
  companyName?: string
  sector?: string
  country?: string
  price?: number
  mktCap?: number
}

type FmpKeyMetricsTtm = {
  roicTTM?: number
  roeTTM?: number
  enterpriseValueTTM?: number
  evToOperatingCashFlowTTM?: number
  evToFreeCashFlowTTM?: number
  bookValuePerShareTTM?: number
  tangibleBookValuePerShareTTM?: number
  netDebtToEBITDATTM?: number
  currentRatioTTM?: number
  interestCoverageTTM?: number
}

type FmpRatiosTtm = {
  grossProfitMarginTTM?: number
  operatingProfitMarginTTM?: number
  priceEarningsRatioTTM?: number
  priceToBookRatioTTM?: number
  priceToFreeCashFlowsRatioTTM?: number
  dividendYieldTTM?: number
  debtEquityRatioTTM?: number
  pegRatioTTM?: number
  currentRatioTTM?: number
  returnOnEquityTTM?: number
  returnOnCapitalEmployedTTM?: number
}

type FmpIncomeStatement = {
  calendarYear?: string
  revenue?: number
  operatingIncome?: number
  netIncome?: number
  eps?: number
  grossProfit?: number
}

type FmpBalanceSheet = {
  calendarYear?: string
  totalDebt?: number
  cashAndCashEquivalents?: number
  totalAssets?: number
  goodwillAndIntangibleAssets?: number
  totalStockholdersEquity?: number
  totalCurrentAssets?: number
  totalCurrentLiabilities?: number
}

type FmpCashFlowStatement = {
  calendarYear?: string
  freeCashFlow?: number
  operatingCashFlow?: number
  capitalExpenditure?: number
}

function mapSector(rawSector: string | undefined): SectorKey {
  const sector = rawSector?.trim()

  switch (sector) {
    case 'Technology':
      return 'Technology'
    case 'Consumer Defensive':
      return 'Consumer Staples'
    case 'Consumer Cyclical':
      return 'Consumer Discretionary'
    case 'Financial Services':
      return 'Financials'
    case 'Healthcare':
      return 'Healthcare'
    case 'Industrials':
      return 'Industrials'
    case 'Energy':
      return 'Energy'
    case 'Communication Services':
      return 'Communication Services'
    case 'Real Estate':
      return 'Real Estate'
    case 'Utilities':
      return 'Utilities'
    case 'Basic Materials':
      return 'Materials'
    default:
      return 'Unknown'
  }
}

function percentOrNull(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return value * 100
}

function ratioOrNull(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return value
} 

function safeDivide(numerator: number | null | undefined, denominator: number | null | undefined) {
  if (
    numerator == null ||
    denominator == null ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return null
  }

  return numerator / denominator
}

function cagrFromSeries(values: Array<number | null | undefined>): number | null {
  const clean = values.filter((value): value is number => value != null && Number.isFinite(value))

  if (clean.length < 2) return null

  const first = clean[0]
  const last = clean[clean.length - 1]
  const periods = clean.length - 1

  if (first <= 0 || last <= 0 || periods <= 0) return null

  return (Math.pow(last / first, 1 / periods) - 1) * 100
}

function average(values: Array<number | null | undefined>): number | null {
  const clean = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (clean.length === 0) return null
  return clean.reduce((sum, value) => sum + value, 0) / clean.length
}

function isStrictlyDeclining(values: Array<number | null | undefined>): boolean | null {
  const clean = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (clean.length < 3) return null

  for (let i = 1; i < clean.length; i += 1) {
    if (!(clean[i] < clean[i - 1])) {
      return false
    }
  }

  return true
}

export async function buildInvestingSnapshot(tickerInput: string): Promise<InvestingSnapshot> {
  const ticker = tickerInput.trim().toUpperCase()

  if (!ticker) {
    throw new Error('Ticker is required')
  }

  const [
    profileData,
    keyMetricsTtmData,
    ratiosTtmData,
    incomeStatements,
    balanceSheets,
    cashFlows,
  ] = await Promise.all([
    fmpFetch<FmpProfile[]>('/profile', { symbol: ticker }),
    fmpFetch<FmpKeyMetricsTtm[]>('/key-metrics-ttm', { symbol: ticker }),
    fmpFetch<FmpRatiosTtm[]>('/ratios-ttm', { symbol: ticker }),
    fmpFetch<FmpIncomeStatement[]>('/income-statement', { symbol: ticker, limit: 5 }),
    fmpFetch<FmpBalanceSheet[]>('/balance-sheet-statement', { symbol: ticker, limit: 5 }),
    fmpFetch<FmpCashFlowStatement[]>('/cash-flow-statement', { symbol: ticker, limit: 5 }),
  ])

  const profile = profileData[0]
  const keyMetricsTtm = keyMetricsTtmData[0]
  const ratiosTtm = ratiosTtmData[0]

  const sortedIncome = [...incomeStatements].sort(
    (a, b) => Number(a.calendarYear ?? 0) - Number(b.calendarYear ?? 0)
  )
  const sortedBalance = [...balanceSheets].sort(
    (a, b) => Number(a.calendarYear ?? 0) - Number(b.calendarYear ?? 0)
  )
  const sortedCashFlows = [...cashFlows].sort(
    (a, b) => Number(a.calendarYear ?? 0) - Number(b.calendarYear ?? 0)
  )

  const latestIncome = sortedIncome[sortedIncome.length - 1]
  const latestBalance = sortedBalance[sortedBalance.length - 1]
  const latestCashFlow = sortedCashFlows[sortedCashFlows.length - 1]

  const revenueSeries = sortedIncome.map((item) => ratioOrNull(item.revenue))
  const epsSeries = sortedIncome.map((item) => ratioOrNull(item.eps))
  const fcfSeries = sortedCashFlows.map((item) => ratioOrNull(item.freeCashFlow))

  const netIncomeSeries = sortedIncome.map((item) => ratioOrNull(item.netIncome))

  const grossMarginTtm =
    percentOrNull(ratiosTtm?.grossProfitMarginTTM) ??
    percentOrNull(
      safeDivide(
        latestIncome?.grossProfit ?? null,
        latestIncome?.revenue ?? null
      )
    )

  const operatingMarginTtm =
    percentOrNull(ratiosTtm?.operatingProfitMarginTTM) ??
    percentOrNull(
      safeDivide(
        latestIncome?.operatingIncome ?? null,
        latestIncome?.revenue ?? null
      )
    )

  const freeCashFlowTtm = ratioOrNull(latestCashFlow?.freeCashFlow)
  const revenueTtm = ratioOrNull(latestIncome?.revenue)
  const ebitTtm = ratioOrNull(latestIncome?.operatingIncome)
  const netIncomeTtm = ratioOrNull(latestIncome?.netIncome)

  const enterpriseValue =
    ratioOrNull(keyMetricsTtm?.enterpriseValueTTM) ??
    (() => {
      const marketCap = ratioOrNull(profile?.mktCap)
      const debt = ratioOrNull(latestBalance?.totalDebt)
      const cash = ratioOrNull(latestBalance?.cashAndCashEquivalents)
      if (marketCap == null || debt == null || cash == null) return null
      return marketCap + debt - cash
    })()

  const evToEbitTtm = ratioOrNull(
    safeDivide(enterpriseValue, ebitTtm)
  )

  const earningsYieldTtm = percentOrNull(
    safeDivide(ebitTtm, enterpriseValue)
  )

  const fcfMarginTtm = percentOrNull(
    safeDivide(freeCashFlowTtm, revenueTtm)
  )

  const positiveEarningsYears = netIncomeSeries.filter(
    (value) => value != null && value > 0
  ).length

  const negativeFcfYearsLast2 =
    sortedCashFlows.length >= 2
      ? sortedCashFlows.slice(-2).every((item) => (item.freeCashFlow ?? 0) < 0)
      : null

  const fcfConversion3yAvg = percentOrNull(
    average(
      sortedCashFlows.slice(-3).map((cf, index) => {
        const income = sortedIncome.slice(-3)[index]
        return safeDivide(cf.freeCashFlow ?? null, income?.netIncome ?? null)
      })
    )
  )

  const revenueTrend3yDeclining = isStrictlyDeclining(revenueSeries.slice(-3))

  const marginDeterioration3y = isStrictlyDeclining(
    sortedIncome.slice(-3).map((item) =>
      safeDivide(item.operatingIncome ?? null, item.revenue ?? null)
    )
  )

  const goodwillToAssets = percentOrNull(
    safeDivide(
      latestBalance?.goodwillAndIntangibleAssets ?? null,
      latestBalance?.totalAssets ?? null
    )
  )

  const roic5ySeries = sortedIncome.map((income, index) => {
    const balance = sortedBalance[index]
    const operatingIncome = income.operatingIncome ?? null
    const equity = balance?.totalStockholdersEquity ?? null
    const debt = balance?.totalDebt ?? null
    const cash = balance?.cashAndCashEquivalents ?? null

    if (
      operatingIncome == null ||
      equity == null ||
      debt == null ||
      cash == null
    ) {
      return null
    }

    const investedCapital = equity + debt - cash
    return safeDivide(operatingIncome, investedCapital)
  })

  const roic5yAvg = percentOrNull(average(roic5ySeries))

  return {
    ticker,
    company: profile?.companyName?.trim() || ticker,
    sector: mapSector(profile?.sector),
    currentPrice: ratioOrNull(profile?.price),
    marketCap: ratioOrNull(profile?.mktCap),
    isUsListed: profile?.country === 'US' ? true : profile?.country ? false : null,

    roicTtm:
      percentOrNull(keyMetricsTtm?.roicTTM) ??
      percentOrNull(ratiosTtm?.returnOnCapitalEmployedTTM),
    roic5yAvg,
    roeTtm:
      percentOrNull(keyMetricsTtm?.roeTTM) ??
      percentOrNull(ratiosTtm?.returnOnEquityTTM),

    grossMarginTtm,
    operatingMarginTtm,
    fcfMarginTtm,

    evToEbitTtm,
    earningsYieldTtm,
    forwardPe: ratioOrNull(ratiosTtm?.priceEarningsRatioTTM),
    pegRatio: ratioOrNull(ratiosTtm?.pegRatioTTM),
    priceToFcfTtm: ratioOrNull(ratiosTtm?.priceToFreeCashFlowsRatioTTM),
    priceToBook: ratioOrNull(ratiosTtm?.priceToBookRatioTTM),

    debtToEquity: ratioOrNull(ratiosTtm?.debtEquityRatioTTM),
    netDebtToEbitda:
      ratioOrNull(keyMetricsTtm?.netDebtToEBITDATTM),
    interestCoverage: ratioOrNull(keyMetricsTtm?.interestCoverageTTM),
    currentRatio:
      ratioOrNull(keyMetricsTtm?.currentRatioTTM) ??
      ratioOrNull(ratiosTtm?.currentRatioTTM),

    revenueGrowth3yCagr: cagrFromSeries(revenueSeries.slice(-4)),
    epsGrowth3yCagr: cagrFromSeries(epsSeries.slice(-4)),
    fcfGrowth3yCagr: cagrFromSeries(fcfSeries.slice(-4)),

    freeCashFlowTtm,
    revenueTtm,
    ebitTtm,
    ebitdaTtm: ratioOrNull(
      ebitTtm != null && latestCashFlow?.capitalExpenditure != null
        ? ebitTtm
        : null
    ),
    netIncomeTtm,

    yearsPositiveEarnings: positiveEarningsYears || null,

    revenueTrend3yDeclining,
    negativeFcfYearsLast2,
    fcfConversion3yAvg,
    goodwillToAssets,
    marginDeterioration3y,
  }
}