import 'server-only'

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3'
const FMP_DAILY_LIMIT = 250


type FmpFetchOptions = {
  path: string
  query?: Record<string, string | number | boolean | undefined | null>
}

type RateLimitState = {
  date: string
  count: number
}

const globalForFmp = globalThis as typeof globalThis & {
  __fmpRateLimitState__?: RateLimitState
}

function getFmpApiKey() {
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    throw new Error('Missing FMP_API_KEY')
  }

  return apiKey
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function trackFmpUsage() {
  const today = getTodayKey()

  if (!globalForFmp.__fmpRateLimitState__ || globalForFmp.__fmpRateLimitState__.date !== today) {
    globalForFmp.__fmpRateLimitState__ = {
      date: today,
      count: 0,
    }
  }

  globalForFmp.__fmpRateLimitState__.count += 1

  const usage = globalForFmp.__fmpRateLimitState__.count

  console.info(`[FMP] ${today} usage ${usage}/${FMP_DAILY_LIMIT}`)

  if (usage > FMP_DAILY_LIMIT) {
    console.warn(`[FMP] Daily usage exceeded: ${usage}/${FMP_DAILY_LIMIT}`)
  }

  return usage
}

function buildFmpUrl({ path, query = {} }: FmpFetchOptions) {
  const apiKey = getFmpApiKey()
  const url = new URL(`${FMP_BASE_URL}/${path.replace(/^\/+/, '')}`)

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })

  url.searchParams.set('apikey', apiKey)

  return url.toString()
}

async function fmpFetch<T>({ path, query }: FmpFetchOptions): Promise<T> {
  trackFmpUsage()

  const response = await fetch(buildFmpUrl({ path, query }), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`FMP request failed (${response.status} ${response.statusText}) for ${path}. ${body}`)
  }

  const data = (await response.json()) as T | {
    'Error Message'?: string
    error?: string
  }

  if (typeof data === 'object' && data !== null) {
    const maybeErrorMessage =
      'Error Message' in data ? data['Error Message'] : undefined
    const maybeError =
      'error' in data ? data.error : undefined

    if (maybeErrorMessage || maybeError) {
      throw new Error(`FMP API error for ${path}: ${maybeErrorMessage ?? maybeError}`)
    }
  }

  return data as T
}

export type FmpQuote = {
  symbol: string
  name?: string
  price: number | null
  changesPercentage?: number | null
  change?: number | null
  dayLow?: number | null
  dayHigh?: number | null
  yearHigh?: number | null
  yearLow?: number | null
  marketCap?: number | null
  priceAvg50?: number | null
  priceAvg200?: number | null
  exchange?: string | null
  volume?: number | null
  avgVolume?: number | null
  open?: number | null
  previousClose?: number | null
  eps?: number | null
  pe?: number | null
  earningsAnnouncement?: string | null
  sharesOutstanding?: number | null
  timestamp?: number | null
  [key: string]: unknown
}

export type FmpIncomeStatement = {
  date: string
  symbol: string
  reportedCurrency?: string | null
  cik?: string | null
  fillingDate?: string | null
  acceptedDate?: string | null
  calendarYear?: string | null
  period?: string | null
  revenue?: number | null
  costOfRevenue?: number | null
  grossProfit?: number | null
  grossProfitRatio?: number | null
  researchAndDevelopmentExpenses?: number | null
  generalAndAdministrativeExpenses?: number | null
  sellingAndMarketingExpenses?: number | null
  operatingExpenses?: number | null
  operatingIncome?: number | null
  operatingIncomeRatio?: number | null
  netIncome?: number | null
  netIncomeRatio?: number | null
  eps?: number | null
  epsdiluted?: number | null
  weightedAverageShsOut?: number | null
  weightedAverageShsOutDil?: number | null
  [key: string]: unknown
}

export type FmpBalanceSheet = {
  date: string
  symbol: string
  reportedCurrency?: string | null
  cik?: string | null
  fillingDate?: string | null
  acceptedDate?: string | null
  calendarYear?: string | null
  period?: string | null
  cashAndCashEquivalents?: number | null
  shortTermInvestments?: number | null
  totalCurrentAssets?: number | null
  propertyPlantEquipmentNet?: number | null
  goodwill?: number | null
  intangibleAssets?: number | null
  totalAssets?: number | null
  accountPayables?: number | null
  shortTermDebt?: number | null
  totalCurrentLiabilities?: number | null
  longTermDebt?: number | null
  totalLiabilities?: number | null
  totalStockholdersEquity?: number | null
  totalEquity?: number | null
  totalDebt?: number | null
  netDebt?: number | null
  [key: string]: unknown
}

export type FmpCashFlowStatement = {
  date: string
  symbol: string
  reportedCurrency?: string | null
  cik?: string | null
  fillingDate?: string | null
  acceptedDate?: string | null
  calendarYear?: string | null
  period?: string | null
  netIncome?: number | null
  depreciationAndAmortization?: number | null
  stockBasedCompensation?: number | null
  changeInWorkingCapital?: number | null
  netCashProvidedByOperatingActivities?: number | null
  investmentsInPropertyPlantAndEquipment?: number | null
  acquisitionsNet?: number | null
  netCashUsedForInvestingActivites?: number | null
  debtRepayment?: number | null
  commonStockRepurchased?: number | null
  dividendsPaid?: number | null
  netCashUsedProvidedByFinancingActivities?: number | null
  netChangeInCash?: number | null
  freeCashFlow?: number | null
  [key: string]: unknown
}

export type FmpKeyMetrics = {
  symbol: string
  date: string
  period?: string | null
  revenuePerShare?: number | null
  netIncomePerShare?: number | null
  operatingCashFlowPerShare?: number | null
  freeCashFlowPerShare?: number | null
  cashPerShare?: number | null
  bookValuePerShare?: number | null
  tangibleBookValuePerShare?: number | null
  shareholdersEquityPerShare?: number | null
  interestDebtPerShare?: number | null
  marketCap?: number | null
  enterpriseValue?: number | null
  peRatio?: number | null
  priceToSalesRatio?: number | null
  pocfratio?: number | null
  pfcfRatio?: number | null
  pbRatio?: number | null
  ptbRatio?: number | null
  evToSales?: number | null
  enterpriseValueOverEBITDA?: number | null
  evToOperatingCashFlow?: number | null
  evToFreeCashFlow?: number | null
  earningsYield?: number | null
  freeCashFlowYield?: number | null
  debtToEquity?: number | null
  debtToAssets?: number | null
  netDebtToEBITDA?: number | null
  currentRatio?: number | null
  interestCoverage?: number | null
  incomeQuality?: number | null
  payoutRatio?: number | null
  roic?: number | null
  roe?: number | null
  capexPerShare?: number | null
  [key: string]: unknown
}

export type FmpRatio = {
  symbol: string
  date: string
  period?: string | null
  currentRatio?: number | null
  quickRatio?: number | null
  cashRatio?: number | null
  grossProfitMargin?: number | null
  operatingProfitMargin?: number | null
  pretaxProfitMargin?: number | null
  netProfitMargin?: number | null
  effectiveTaxRate?: number | null
  returnOnAssets?: number | null
  returnOnEquity?: number | null
  returnOnCapitalEmployed?: number | null
  debtRatio?: number | null
  debtEquityRatio?: number | null
  interestCoverage?: number | null
  receivablesTurnover?: number | null
  payablesTurnover?: number | null
  inventoryTurnover?: number | null
  assetTurnover?: number | null
  payoutRatio?: number | null
  priceToBookRatio?: number | null
  priceToSalesRatio?: number | null
  priceEarningsRatio?: number | null
  priceToFreeCashFlowsRatio?: number | null
  dividendYield?: number | null
  enterpriseValueMultiple?: number | null
  priceFairValue?: number | null
  [key: string]: unknown
}

export type FmpCompanyProfile = {
  symbol: string
  price?: number | null
  beta?: number | null
  volAvg?: number | null
  mktCap?: number | null
  lastDiv?: number | null
  range?: string | null
  changes?: number | null
  companyName?: string | null
  currency?: string | null
  cik?: string | null
  isin?: string | null
  cusip?: string | null
  exchange?: string | null
  exchangeShortName?: string | null
  industry?: string | null
  website?: string | null
  description?: string | null
  ceo?: string | null
  sector?: string | null
  country?: string | null
  fullTimeEmployees?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  dcfDiff?: number | null
  dcf?: number | null
  image?: string | null
  ipoDate?: string | null
  defaultImage?: boolean | null
  isEtf?: boolean | null
  isActivelyTrading?: boolean | null
  isAdr?: boolean | null
  isFund?: boolean | null
  [key: string]: unknown
}

export type FmpFinancialGrowth = {
  symbol: string
  date: string
  period?: string | null
  revenueGrowth?: number | null
  grossProfitGrowth?: number | null
  ebitgrowth?: number | null
  operatingIncomeGrowth?: number | null
  netIncomeGrowth?: number | null
  epsgrowth?: number | null
  epsdilutedGrowth?: number | null
  weightedAverageSharesGrowth?: number | null
  weightedAverageSharesDilutedGrowth?: number | null
  dividendsperShareGrowth?: number | null
  operatingCashFlowGrowth?: number | null
  freeCashFlowGrowth?: number | null
  receivablesGrowth?: number | null
  inventoryGrowth?: number | null
  assetGrowth?: number | null
  debtGrowth?: number | null
  rdexpenseGrowth?: number | null
  sgaexpensesGrowth?: number | null
  [key: string]: unknown
}

export type FmpAnalystEstimate = {
  symbol?: string
  date?: string
  estimatedRevenueLow?: number | null
  estimatedRevenueHigh?: number | null
  estimatedRevenueAvg?: number | null
  estimatedEbitdaLow?: number | null
  estimatedEbitdaHigh?: number | null
  estimatedEbitdaAvg?: number | null
  estimatedEbitLow?: number | null
  estimatedEbitHigh?: number | null
  estimatedEbitAvg?: number | null
  estimatedNetIncomeLow?: number | null
  estimatedNetIncomeHigh?: number | null
  estimatedNetIncomeAvg?: number | null
  estimatedSgaExpenseLow?: number | null
  estimatedSgaExpenseHigh?: number | null
  estimatedSgaExpenseAvg?: number | null
  estimatedEpsAvg?: number | null
  estimatedEpsHigh?: number | null
  estimatedEpsLow?: number | null
  numberAnalystEstimatedRevenue?: number | null
  numberAnalystsEstimatedEps?: number | null
  [key: string]: unknown
}

export type FmpInsiderTrading = {
  symbol?: string | null
  filingDate?: string | null
  transactionDate?: string | null
  reportingCik?: string | null
  transactionType?: string | null
  securitiesOwned?: number | null
  companyCik?: string | null
  reportingName?: string | null
  typeOfOwner?: string | null
  acquistionOrDisposition?: string | null
  formType?: string | null
  securitiesTransacted?: number | null
  price?: number | null
  securityName?: string | null
  link?: string | null
  [key: string]: unknown
}

export type FmpScreenerResult = {
  symbol: string
  companyName?: string | null
  marketCap?: number | null
  sector?: string | null
  industry?: string | null
  beta?: number | null
  price?: number | null
  lastAnnualDividend?: number | null
  volume?: number | null
  exchange?: string | null
  exchangeShortName?: string | null
  country?: string | null
  isEtf?: boolean | null
  isActivelyTrading?: boolean | null
  [key: string]: unknown
}

export type FmpEnterpriseValue = {
  symbol: string
  date: string
  stockPrice?: number | null
  numberOfShares?: number | null
  marketCapitalization?: number | null
  minusCashAndCashEquivalents?: number | null
  addTotalDebt?: number | null
  enterpriseValue?: number | null
  [key: string]: unknown
}

export type StockScreenerParams = {
  marketCapMoreThan?: number
  marketCapLowerThan?: number
  priceMoreThan?: number
  priceLowerThan?: number
  betaMoreThan?: number
  betaLowerThan?: number
  volumeMoreThan?: number
  volumeLowerThan?: number
  dividendMoreThan?: number
  dividendLowerThan?: number
  isEtf?: boolean
  isActivelyTrading?: boolean
  sector?: string
  industry?: string
  country?: string
  exchange?: string
  limit?: number
}

export async function getQuote(ticker: string) {
  const data = await fmpFetch<FmpQuote[]>({
    path: `quote/${encodeURIComponent(ticker.toUpperCase())}`,
  })

  return data[0] ?? null
}

export async function getBatchQuotes(tickers: string[]) {
  if (tickers.length === 0) return []

  return fmpFetch<FmpQuote[]>({
    path: `quote/${encodeURIComponent(
      tickers.map((ticker) => ticker.toUpperCase()).join(',')
    )}`,
  })
}

export async function getIncomeStatement(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 5
) {
  return fmpFetch<FmpIncomeStatement[]>({
    path: `income-statement/${encodeURIComponent(ticker.toUpperCase())}`,
    query: { period, limit },
  })
}

export async function getBalanceSheet(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 5
) {
  return fmpFetch<FmpBalanceSheet[]>({
    path: `balance-sheet-statement/${encodeURIComponent(ticker.toUpperCase())}`,
    query: { period, limit },
  })
}

export async function getCashFlowStatement(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 5
) {
  return fmpFetch<FmpCashFlowStatement[]>({
    path: `cash-flow-statement/${encodeURIComponent(ticker.toUpperCase())}`,
    query: { period, limit },
  })
}

export async function getKeyMetrics(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 5
) {
  return fmpFetch<FmpKeyMetrics[]>({
    path: `key-metrics/${encodeURIComponent(ticker.toUpperCase())}`,
    query: { period, limit },
  })
}

export async function getKeyMetricsTTM(ticker: string) {
  const data = await fmpFetch<FmpKeyMetrics[]>({
    path: `key-metrics-ttm/${encodeURIComponent(ticker.toUpperCase())}`,
  })

  return data[0] ?? null
}

export async function getRatios(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 5
) {
  return fmpFetch<FmpRatio[]>({
    path: `ratios/${encodeURIComponent(ticker.toUpperCase())}`,
    query: { period, limit },
  })
}

export async function getRatiosTTM(ticker: string) {
  const data = await fmpFetch<FmpRatio[]>({
    path: `ratios-ttm/${encodeURIComponent(ticker.toUpperCase())}`,
  })

  return data[0] ?? null
}

export async function getCompanyProfile(ticker: string) {
  const data = await fmpFetch<FmpCompanyProfile[]>({
    path: `profile/${encodeURIComponent(ticker.toUpperCase())}`,
  })

  return data[0] ?? null
}

export async function getFinancialGrowth(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 5
) {
  return fmpFetch<FmpFinancialGrowth[]>({
    path: `financial-growth/${encodeURIComponent(ticker.toUpperCase())}`,
    query: { period, limit },
  })
}

export async function getAnalystEstimates(ticker: string) {
  return fmpFetch<FmpAnalystEstimate[]>({
    path: `analyst-estimates/${encodeURIComponent(ticker.toUpperCase())}`,
  })
}

export async function getInsiderTrading(ticker: string) {
  return fmpFetch<FmpInsiderTrading[]>({
    path: 'insider-trading',
    query: {
      symbol: ticker.toUpperCase(),
    },
  })
}

export async function stockScreener(params: StockScreenerParams) {
  return fmpFetch<FmpScreenerResult[]>({
    path: 'stock-screener',
    query: params,
  })
}

export async function getEnterpriseValue(
  ticker: string,
  period: 'annual' | 'quarter' = 'annual',
  limit = 5
) {
  return fmpFetch<FmpEnterpriseValue[]>({
    path: `enterprise-values/${encodeURIComponent(ticker.toUpperCase())}`,
    query: { period, limit },
  })
}

export function getFmpUsageStatus() {
  const today = getTodayKey()
  const state = globalForFmp.__fmpRateLimitState__

  if (!state || state.date !== today) {
    return {
      date: today,
      count: 0,
      limit: FMP_DAILY_LIMIT,
      remaining: FMP_DAILY_LIMIT,
    }
  }

  return {
    date: state.date,
    count: state.count,
    limit: FMP_DAILY_LIMIT,
    remaining: Math.max(0, FMP_DAILY_LIMIT - state.count),
  }
}