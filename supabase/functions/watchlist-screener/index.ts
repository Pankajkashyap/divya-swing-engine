// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateCronSecret } from '../_shared/cronAuth.ts'
import { getCadenceWindowKey } from '../_shared/marketHours.ts'
import { startScanLog, finishScanLog, hasAlreadyProcessed } from '../_shared/scanLog.ts'
import { sendEmail } from '../_shared/email/resend.ts'
import { screenerComplete } from '../_shared/email/templates/screenerComplete.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const massiveApiKey = Deno.env.get('MASSIVE_API_KEY') ?? ''
const massiveBaseUrl = 'https://api.polygon.io'

// Tickers scanned per night. At 12.5s delay each, 10 tickers = 125s — safely within the 150s timeout.
const BATCH_SIZE = 5

type UserSettingsRow = {
  user_id: string
  notification_email: string | null
  screener_enabled: boolean | null
  screener_min_price: number | null
  screener_min_avg_volume: number | null
  screener_min_eps_growth_pct: number | null
  screener_min_revenue_growth_pct: number | null
  screener_exchanges: string | null
  screener_max_candidates: number | null
}

type AggregateBar = {
  c?: number
  v?: number
  t?: number
}

type FinancialResult = {
  fiscal_period?: string
  fiscal_year?: string
  financials?: {
    income_statement?: {
      basic_earnings_per_share?: { value?: number }
      revenues?: { value?: number }
    }
  }
}

// Find the same fiscal period from the prior year
function findPriorYearQuarter(
  results: FinancialResult[],
  targetPeriod: string,
  targetYear: string
): FinancialResult | undefined {
  const targetYearNum = parseInt(targetYear)
  if (isNaN(targetYearNum)) return undefined
  return results.find(
    (r) =>
      r.fiscal_period === targetPeriod &&
      parseInt(r.fiscal_year ?? '0') === targetYearNum - 1
  )
}

type Candidate = {
  ticker: string
  companyName: string | null
  price: number
  avgVolume: number
  epsGrowthPct: number | null
  revenueGrowthPct: number | null
}

type PricePassCandidate = {
  ticker: string
  price: number
  volume: number
  rsLineState: 'leading' | 'confirmed' | 'warning' | null
  rsLineConfirmed: boolean | null
  volumeDryUpPass: boolean
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getRecentTradingDateRange(): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)
  const from = new Date(now)
  // 300 calendar days covers ~200 trading days needed for 200-day MA
  from.setDate(from.getDate() - 300)
  return {
    from: from.toISOString().slice(0, 10),
    to,
  }
}

// Calculate simple moving average from the most recent N bars
// bars must be sorted descending (newest first)
function calculateSMA(bars: AggregateBar[], period: number): number | null {
  if (bars.length < period) return null
  const slice = bars.slice(0, period)
  const sum = slice.reduce((acc, bar) => acc + (bar.c ?? 0), 0)
  return sum / period
}

function calculateAvgVolume(bars: AggregateBar[], period: number): number | null {
  if (bars.length < period) return null
  const slice = bars.slice(0, period)
  const sum = slice.reduce((acc, bar) => acc + (bar.v ?? 0), 0)
  return sum / period
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function calculateGrowth(current: number | null, prior: number | null): number | null {
  if (current === null || prior === null || prior === 0) return null
  return Number((((current - prior) / Math.abs(prior)) * 100).toFixed(2))
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

async function safeFinishScanLog(params: {
  logId: string | null
  status: 'started' | 'completed' | 'skipped' | 'failed'
  message?: string
  changesJson?: Record<string, unknown>
}): Promise<void> {
  if (!params.logId) return
  await finishScanLog({
    logId: params.logId,
    status: params.status,
    message: params.message,
    changesJson: params.changesJson,
  })
}

// Read the cursor from the last completed screener run.
// Returns 0 if no prior run exists (start from beginning of universe).
async function getLastCursor(): Promise<number> {
  try {
    const { data } = await supabase
      .from('scan_logs')
      .select('changes_json')
      .eq('job_type', 'watchlist-screener')
      .eq('status', 'completed')
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const cursor = (data?.changes_json as Record<string, unknown>)?.cursor_end
    return typeof cursor === 'number' && Number.isFinite(cursor) ? cursor : 0
  } catch {
    return 0
  }
}

// Calculate RS line state by comparing stock's returns to SPY's returns.
// stockBars and spyBars must both be sorted descending (newest first).
function calculateRsLineState(
  stockBars: AggregateBar[],
  spyBars: AggregateBar[]
): 'leading' | 'confirmed' | 'warning' | null {
  if (stockBars.length < 60 || spyBars.length < 60) return null

  const stockNow = stockBars[0].c ?? null
  const spyNow = spyBars[0].c ?? null
  if (!stockNow || !spyNow) return null

  // 12-month return comparison
  const period12m = Math.min(stockBars.length - 1, 251)
  const spyPeriod12m = Math.min(spyBars.length - 1, 251)
  const stockPy = stockBars[period12m].c ?? null
  const spyPy = spyBars[spyPeriod12m].c ?? null
  if (!stockPy || !spyPy) return null

  const stockReturn12m = (stockNow - stockPy) / stockPy
  const spyReturn12m = (spyNow - spyPy) / spyPy

  // Underperforming SPY over 12 months → warning
  if (stockReturn12m <= spyReturn12m) {
    return 'warning'
  }

  // Check for acceleration (leading signal):
  // Compare recent 3-month RS margin vs prior 3-month RS margin
  const period3m = Math.min(stockBars.length - 1, 62)
  const period6m = Math.min(stockBars.length - 1, 125)
  const spyPeriod3m = Math.min(spyBars.length - 1, 62)
  const spyPeriod6m = Math.min(spyBars.length - 1, 125)

  const stock3m = stockBars[period3m].c ?? null
  const stock6m = stockBars[period6m].c ?? null
  const spy3m = spyBars[spyPeriod3m].c ?? null
  const spy6m = spyBars[spyPeriod6m].c ?? null

  if (stock3m && stock6m && spy3m && spy6m) {
    const stockReturn_now_3m = (stockNow - stock3m) / stock3m
    const spyReturn_now_3m = (spyNow - spy3m) / spy3m
    const stockReturn_3m_6m = (stock3m - stock6m) / stock6m
    const spyReturn_3m_6m = (spy3m - spy6m) / spy6m

    const recentExcess = stockReturn_now_3m - spyReturn_now_3m
    const priorExcess = stockReturn_3m_6m - spyReturn_3m_6m

    // Leading: RS margin improving AND meaningful recent outperformance
    if (recentExcess > 0.05 && recentExcess > priorExcess) {
      return 'leading'
    }
  }

  return 'confirmed'
}

// Calculate volume dry-up: recent 15-day avg volume < 70% of 50-day avg volume.
// sortedBars must be sorted descending (newest first).
function calculateVolumeDryUp(
  sortedBars: AggregateBar[],
  avgVolume50d: number
): boolean {
  const avgVolume15d = calculateAvgVolume(sortedBars, 15)
  if (avgVolume15d === null || avgVolume50d === 0) return false
  return avgVolume15d < avgVolume50d * 0.70
}

Deno.serve(async (request: Request) => {
  let logId: string | null = null

  try {
    const authResult = validateCronSecret(request)
    if (!authResult.authorised) {
      return jsonResponse({ success: false, reason: authResult.reason }, 401)
    }

    const { data: userSettings, error: userSettingsError } = await supabase
      .from('user_settings')
      .select(
        'user_id, notification_email, screener_enabled, screener_min_price, screener_min_avg_volume, screener_min_eps_growth_pct, screener_min_revenue_growth_pct, screener_exchanges, screener_max_candidates'
      )
      .limit(1)
      .maybeSingle()

    if (userSettingsError) {
      return jsonResponse(
        { success: false, reason: `Failed to load user settings: ${userSettingsError.message}` },
        500
      )
    }

    if (!userSettings?.user_id) {
      return jsonResponse({ success: false, reason: 'No user settings found' }, 500)
    }

    const settings = userSettings as UserSettingsRow
    const userId = settings.user_id

    if (settings.screener_enabled === false) {
      return jsonResponse({ skipped: true, reason: 'Screener disabled in settings' }, 200)
    }

    if (!massiveApiKey) {
      return jsonResponse({ success: false, reason: 'MASSIVE_API_KEY is not configured' }, 500)
    }

    const { data: universeData, error: universeError } = await supabase
      .from('ticker_universe')
      .select('ticker, index_membership')
      .eq('is_active', true)
      .order('index_membership', { ascending: true })

    const FALLBACK_TICKERS = [
      'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA',
      'JPM', 'V', 'UNH', 'LLY', 'AVGO', 'XOM', 'MA', 'JNJ',
      'HD', 'COST', 'PG', 'ABBV', 'MRK',
    ]

    if (universeError || !universeData || universeData.length === 0) {
      console.warn('[watchlist-screener] ticker_universe empty or failed to load. Using fallback.')
    }

    const rawUniverse: string[] =
      universeError || !universeData || universeData.length === 0
        ? FALLBACK_TICKERS
        : [
            ...universeData
              .filter((r) => r.index_membership === 'NASDAQ 100')
              .map((r) => r.ticker)
              .sort(),
            ...universeData
              .filter((r) => r.index_membership !== 'NASDAQ 100')
              .map((r) => r.ticker)
              .sort(),
          ]

    const preFiltered = rawUniverse
      .filter((ticker) => {
        if (ticker.endsWith('W') || ticker.endsWith('U') || ticker.endsWith('R')) return false
        if (ticker.includes('.')) return false
        if (ticker.length < 2 || ticker.length > 5) return false
        return true
      })
      .sort()

    const windowKey = getCadenceWindowKey('watchlist-screener')

    const alreadyProcessed = await hasAlreadyProcessed({
      jobType: 'watchlist-screener',
      windowKey,
    })

    if (alreadyProcessed) {
      return jsonResponse({ skipped: true, reason: 'Already processed this window' }, 200)
    }

    logId = await startScanLog({
      userId,
      jobType: 'watchlist-screener',
      windowKey,
    })

    const cursorStart = await getLastCursor()
    const universeSize = preFiltered.length
    const endIndex = cursorStart + BATCH_SIZE
    const tickersToProcess =
      endIndex <= universeSize
        ? preFiltered.slice(cursorStart, endIndex)
        : [
            ...preFiltered.slice(cursorStart),
            ...preFiltered.slice(0, endIndex - universeSize),
          ]
    const cursorEnd = endIndex % universeSize

    console.log(
      `[watchlist-screener] Cursor: ${cursorStart} → ${cursorEnd} of ${universeSize}. ` +
      `Processing ${tickersToProcess.length} tickers.`
    )

    const minPrice = Number(settings.screener_min_price ?? 10)
    const minAvgVolume = Number(settings.screener_min_avg_volume ?? 500000)
    const maxCandidates = Number(settings.screener_max_candidates ?? 10)
    const minEpsGuard = settings.screener_min_eps_growth_pct ?? 25
    const minRevenueGuard = settings.screener_min_revenue_growth_pct ?? 25
    const { from, to } = getRecentTradingDateRange()

    let passedCount = 0
    let addedCount = 0

    type AddedCandidate = {
      ticker: string
      companyName: string | null
      epsGrowthPct: number | null
      revenueGrowthPct: number | null
      screenedPrice: number | null
    }

    const addedCandidates: AddedCandidate[] = []
    const rejectionCounts = {
      fetch_error: 0,
      price_too_low: 0,
      volume_too_low: 0,
      trend_template_fail: 0,
      eps_too_low: 0,
      revenue_too_low: 0,
      already_in_watchlist: 0,
      zero_fundamentals: 0,
    }

    const pricePassList: PricePassCandidate[] = []
    const candidateLogIds = new Map<string, string>()

    // ─── Fetch SPY bars once for RS line calculation ────────────────────────
    // One API call before Pass 1. Uses same date range as stock bars.
    let spyBarsForRs: AggregateBar[] = []
    try {
      const spyUrl =
        `${massiveBaseUrl}/v2/aggs/ticker/SPY/range/1/day/${from}/${to}` +
        `?adjusted=true&sort=desc&limit=200&apiKey=${massiveApiKey}`
      const spyResponse = await fetchWithTimeout(spyUrl, {}, 10000)
      if (spyResponse.ok) {
        const spyJson = (await spyResponse.json()) as { results?: AggregateBar[] }
        spyBarsForRs = spyJson.results ?? []
        console.log(`[watchlist-screener] SPY bars fetched for RS: ${spyBarsForRs.length}`)
      } else {
        console.warn('[watchlist-screener] SPY bars fetch failed — RS line will be null')
      }
    } catch (err) {
      console.warn('[watchlist-screener] SPY bars fetch error:', err)
    }
    // Rate limit delay after SPY fetch — replaces the 2000ms warm-up
    await delay(12500)

    // ─── PASS 1: Price, Volume & Trend Template ───────────────────────────────

    console.log(`[watchlist-screener] Pass 1 starting for ${tickersToProcess.length} tickers.`)

    for (const ticker of tickersToProcess) {
      try {
        const aggregateUrl =
          `${massiveBaseUrl}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}` +
          `?adjusted=true&sort=desc&limit=200&apiKey=${massiveApiKey}`

        const aggResponse = await fetchWithTimeout(aggregateUrl, {}, 10000)

        if (!aggResponse.ok) {
          rejectionCounts.fetch_error += 1
          console.error(
            `[watchlist-screener] Pass 1 HTTP error for ${ticker}: status=${aggResponse.status} statusText=${aggResponse.statusText}`
          )
          try {
            const errBody = await aggResponse.text()
            console.error(`[watchlist-screener] Pass 1 error body for ${ticker}:`, errBody.slice(0, 200))
          } catch { /* ignore */ }
          try {
            const { data: logRow } = await supabase
              .from('screener_candidate_log')
              .insert({ user_id: userId, screener_run_id: logId ?? windowKey, ticker, pass1_price: null, pass1_volume: null, pass1_passed: false, pass2_passed: false, final_passed: false, rejection_reason: 'fetch_error' })
              .select('id').single()
            if (logRow?.id) candidateLogIds.set(ticker, logRow.id)
          } catch (logErr) { console.error('[screener-log] Pass 1 fetch_error log failed:', logErr) }
          await delay(12500)
          continue
        }

        const aggJson = (await aggResponse.json()) as { results?: AggregateBar[] }
        const bars = aggJson.results ?? []

        if (bars.length === 0) {
          rejectionCounts.fetch_error += 1
          try {
            const { data: logRow } = await supabase
              .from('screener_candidate_log')
              .insert({ user_id: userId, screener_run_id: logId ?? windowKey, ticker, pass1_price: null, pass1_volume: null, pass1_passed: false, pass2_passed: false, final_passed: false, rejection_reason: 'fetch_error' })
              .select('id').single()
            if (logRow?.id) candidateLogIds.set(ticker, logRow.id)
          } catch (logErr) { console.error('[screener-log] Pass 1 empty bars log failed:', logErr) }
          await delay(12500)
          continue
        }

        const sortedBars = [...bars].sort((a, b) => (b.t ?? 0) - (a.t ?? 0))
        const latestBar = sortedBars[0]
        const price = toNumberOrNull(latestBar?.c)
        const volume = toNumberOrNull(latestBar?.v)
        const avgVolume50d = calculateAvgVolume(sortedBars, 50)

        if (price === null || volume === null || avgVolume50d === null) {
          rejectionCounts.fetch_error += 1
          try {
            const { data: logRow } = await supabase
              .from('screener_candidate_log')
              .insert({ user_id: userId, screener_run_id: logId ?? windowKey, ticker, pass1_price: price, pass1_volume: null, pass1_passed: false, pass2_passed: false, final_passed: false, rejection_reason: 'fetch_error' })
              .select('id').single()
            if (logRow?.id) candidateLogIds.set(ticker, logRow.id)
          } catch (logErr) { console.error('[screener-log] Pass 1 null price/volume log failed:', logErr) }
          await delay(12500)
          continue
        }

        if (price < minPrice) {
          rejectionCounts.price_too_low += 1
          try {
            const { data: logRow } = await supabase
              .from('screener_candidate_log')
              .insert({ user_id: userId, screener_run_id: logId ?? windowKey, ticker, pass1_price: price, pass1_volume: null, pass1_passed: false, pass2_passed: false, final_passed: false, rejection_reason: 'price_too_low' })
              .select('id').single()
            if (logRow?.id) candidateLogIds.set(ticker, logRow.id)
          } catch (logErr) { console.error('[screener-log] Pass 1 price_too_low log failed:', logErr) }
          await delay(12500)
          continue
        }

        if (avgVolume50d < minAvgVolume) {
          rejectionCounts.volume_too_low += 1
          try {
            const { data: logRow } = await supabase
              .from('screener_candidate_log')
              .insert({ user_id: userId, screener_run_id: logId ?? windowKey, ticker, pass1_price: price, pass1_volume: avgVolume50d, pass1_passed: false, pass2_passed: false, final_passed: false, rejection_reason: 'volume_too_low' })
              .select('id').single()
            if (logRow?.id) candidateLogIds.set(ticker, logRow.id)
          } catch (logErr) { console.error('[screener-log] Pass 1 volume_too_low log failed:', logErr) }
          await delay(12500)
          continue
        }

        // ── Trend Template Check ────────────────────────────────────────
        const sma50  = calculateSMA(sortedBars, 50)
        const sma150 = calculateSMA(sortedBars, 150)
        const sma200 = calculateSMA(sortedBars, 200)
        const sma200_30daysAgo = bars.length >= 230
          ? calculateSMA(sortedBars.slice(30), 200)
          : null

        const yearBars = sortedBars.slice(0, 252)
        const high52w = yearBars.length > 0
          ? Math.max(...yearBars.map(b => b.c ?? 0))
          : null
        const low52w = yearBars.length > 0
          ? Math.min(...yearBars.map(b => b.c ?? 0))
          : null

        const ttCriteria = {
          aboveSma50:    sma50  !== null && price > sma50,
          aboveSma150:   sma150 !== null && price > sma150,
          aboveSma200:   sma200 !== null && price > sma200,
          sma50AboveSma150:  sma50 !== null && sma150 !== null && sma50 > sma150,
          sma150AboveSma200: sma150 !== null && sma200 !== null && sma150 > sma200,
          sma200Trending:    sma200 !== null && sma200_30daysAgo !== null && sma200 > sma200_30daysAgo,
          within25PctOf52wHigh: high52w !== null && price >= high52w * 0.75,
          above25PctOf52wLow:   low52w  !== null && price >= low52w  * 1.25,
        }

        const trendTemplatePass = Object.values(ttCriteria).every(Boolean)

        if (!trendTemplatePass) {
          rejectionCounts.trend_template_fail += 1
          const failedCriteria = Object.entries(ttCriteria)
            .filter(([, v]) => !v)
            .map(([k]) => k)
            .join(', ')
          console.log(`[watchlist-screener] ${ticker} failed Trend Template: ${failedCriteria}`)
          try {
            const { data: logRow } = await supabase
              .from('screener_candidate_log')
              .insert({
                user_id: userId,
                screener_run_id: logId ?? windowKey,
                ticker,
                pass1_price: price,
                pass1_volume: avgVolume50d,
                pass1_passed: false,
                pass2_passed: false,
                final_passed: false,
                rejection_reason: 'trend_template_fail',
              })
              .select('id').single()
            if (logRow?.id) candidateLogIds.set(ticker, logRow.id)
          } catch (logErr) { console.error('[screener-log] Trend template fail log failed:', logErr) }
          await delay(12500)
          continue
        }

        // ── Calculate RS line state and volume dry-up from existing bars ────
        // No extra API calls — uses bars already fetched above
        const rsLineState = spyBarsForRs.length >= 60
          ? calculateRsLineState(sortedBars, spyBarsForRs)
          : null
        const rsLineConfirmed =
          rsLineState === 'leading' || rsLineState === 'confirmed' ? true
          : rsLineState === 'warning' ? false
          : null
        const volumeDryUpPass = calculateVolumeDryUp(sortedBars, avgVolume50d)

        console.log(`[watchlist-screener] ${ticker} — RS: ${rsLineState}, VolDryUp: ${volumeDryUpPass}`)

        pricePassList.push({
          ticker,
          price,
          volume: avgVolume50d,
          rsLineState,
          rsLineConfirmed,
          volumeDryUpPass,
        })

        try {
          const { data: logRow } = await supabase
            .from('screener_candidate_log')
            .insert({ user_id: userId, screener_run_id: logId ?? windowKey, ticker, pass1_price: price, pass1_volume: avgVolume50d, pass1_passed: true, pass2_passed: false, final_passed: false, rejection_reason: null })
            .select('id').single()
          if (logRow?.id) candidateLogIds.set(ticker, logRow.id)
        } catch (logErr) { console.error('[screener-log] Pass 1 pass log failed:', logErr) }

      } catch (error) {
        rejectionCounts.fetch_error += 1
        console.error(`[watchlist-screener] Pass 1 aggregate fetch failed for ${ticker}:`, error)
        try {
          const { data: logRow } = await supabase
            .from('screener_candidate_log')
            .insert({ user_id: userId, screener_run_id: logId ?? windowKey, ticker, pass1_price: null, pass1_volume: null, pass1_passed: false, pass2_passed: false, final_passed: false, rejection_reason: 'fetch_error' })
            .select('id').single()
          if (logRow?.id) candidateLogIds.set(ticker, logRow.id)
        } catch (logErr) { console.error('[screener-log] Pass 1 catch log failed:', logErr) }
      }

      await delay(12500)
    }

    console.log(
      `[watchlist-screener] Pass 1 complete. Price/volume passed: ${pricePassList.length} of ${tickersToProcess.length}`
    )

    // ─── PASS 2: Fundamentals ─────────────────────────────────────────────────

    console.log(
      `[watchlist-screener] Pass 2 starting. Fundamentals screening for ${pricePassList.length} tickers.`
    )

    for (const shortlisted of pricePassList) {
      if (addedCount >= maxCandidates) {
        console.log(`[watchlist-screener] Reached max candidates (${maxCandidates}). Stopping.`)
        break
      }

      const ticker = shortlisted.ticker

      try {
        const financialsUrl =
          `${massiveBaseUrl}/vX/reference/financials?ticker=${encodeURIComponent(ticker)}` +
          `&timeframe=quarterly&order=desc&limit=8&apiKey=${massiveApiKey}`

        const finResponse = await fetchWithTimeout(financialsUrl, {}, 8000)

        if (!finResponse.ok) {
          rejectionCounts.fetch_error += 1
          console.error(
            `[watchlist-screener] Pass 2 financials HTTP error for ${ticker}: status=${finResponse.status}`
          )
          await delay(12500)
          continue
        }

        const finJson = (await finResponse.json()) as { results?: FinancialResult[] }
        const financialResults = finJson.results ?? []

        if (financialResults.length < 2) {
          rejectionCounts.fetch_error += 1
          await delay(12500)
          continue
        }

        const q0 = financialResults[0]
        const q1 = financialResults[1]
        const q2 = financialResults[2]

        const q0_py = q0?.fiscal_period && q0?.fiscal_year
          ? findPriorYearQuarter(financialResults, q0.fiscal_period, q0.fiscal_year)
          : undefined
        const q1_py = q1?.fiscal_period && q1?.fiscal_year
          ? findPriorYearQuarter(financialResults, q1.fiscal_period, q1.fiscal_year)
          : undefined
        const q2_py = q2?.fiscal_period && q2?.fiscal_year
          ? findPriorYearQuarter(financialResults, q2.fiscal_period, q2.fiscal_year)
          : undefined

        if (!q0_py) {
          rejectionCounts.fetch_error += 1
          await delay(12500)
          continue
        }

        const currentEps = toNumberOrNull(
          q0?.financials?.income_statement?.basic_earnings_per_share?.value
        )
        const priorEps = toNumberOrNull(
          q0_py?.financials?.income_statement?.basic_earnings_per_share?.value
        )
        const currentEps1 = toNumberOrNull(
          q1?.financials?.income_statement?.basic_earnings_per_share?.value
        )
        const priorEps1 = toNumberOrNull(
          q1_py?.financials?.income_statement?.basic_earnings_per_share?.value
        )
        const currentEps2 = toNumberOrNull(
          q2?.financials?.income_statement?.basic_earnings_per_share?.value
        )
        const priorEps2 = toNumberOrNull(
          q2_py?.financials?.income_statement?.basic_earnings_per_share?.value
        )
        const currentRevenue = toNumberOrNull(
          q0?.financials?.income_statement?.revenues?.value
        )
        const priorRevenue = toNumberOrNull(
          q0_py?.financials?.income_statement?.revenues?.value
        )

        const epsGrowth  = calculateGrowth(currentEps, priorEps)
        const epsGrowth1 = calculateGrowth(currentEps1, priorEps1)
        const epsGrowth2 = calculateGrowth(currentEps2, priorEps2)
        const revenueGrowth = calculateGrowth(currentRevenue, priorRevenue)

        const epsAccelerating =
          epsGrowth !== null && epsGrowth1 !== null
            ? epsGrowth >= epsGrowth1
            : true

        const candidate: Candidate = {
          ticker,
          companyName: null,
          price: shortlisted.price,
          avgVolume: shortlisted.volume,
          epsGrowthPct: epsGrowth,
          revenueGrowthPct: revenueGrowth,
        }

        let rejectionReason: string | null = null

        if (candidate.epsGrowthPct === null || candidate.revenueGrowthPct === null) {
          rejectionReason = 'zero_fundamentals'
          rejectionCounts.zero_fundamentals += 1
        } else if (candidate.epsGrowthPct < minEpsGuard) {
          rejectionReason = 'eps_too_low'
          rejectionCounts.eps_too_low += 1
        } else if (!epsAccelerating) {
          rejectionReason = 'eps_decelerating'
          rejectionCounts.eps_too_low += 1
          console.log(
            `[watchlist-screener] ${ticker} rejected: EPS decelerating ` +
            `(Q0: ${epsGrowth?.toFixed(1)}% vs Q1: ${epsGrowth1?.toFixed(1)}% vs Q2: ${epsGrowth2?.toFixed(1)}%)`
          )
        } else if (candidate.revenueGrowthPct < minRevenueGuard) {
          rejectionReason = 'revenue_too_low'
          rejectionCounts.revenue_too_low += 1
        } else if (candidate.price < (settings.screener_min_price ?? 10)) {
          rejectionReason = 'price_too_low'
          rejectionCounts.price_too_low += 1
        } else if (candidate.avgVolume < (settings.screener_min_avg_volume ?? 500000)) {
          rejectionReason = 'volume_too_low'
          rejectionCounts.volume_too_low += 1
        }

        if (rejectionReason !== null) {
          try {
            const logRowId = candidateLogIds.get(ticker)
            if (logRowId) {
              await supabase
                .from('screener_candidate_log')
                .update({
                  company_name: candidate.companyName,
                  pass2_eps_growth_pct: candidate.epsGrowthPct,
                  pass2_revenue_growth_pct: candidate.revenueGrowthPct,
                  pass2_passed: false,
                  final_passed: false,
                  rejection_reason: rejectionReason,
                })
                .eq('id', logRowId)
            }
          } catch (logErr) { console.error('[screener-log] Pass 2 reject log failed:', logErr) }
          await delay(12500)
          continue
        }

        // Fetch company name
        try {
          const detailUrl =
            `${massiveBaseUrl}/v3/reference/tickers/${encodeURIComponent(ticker)}` +
            `?apiKey=${massiveApiKey}`
          const detailResponse = await fetchWithTimeout(detailUrl, {}, 5000)
          if (detailResponse.ok) {
            const detailData = await detailResponse.json()
            candidate.companyName = detailData?.results?.name ?? null
          }
        } catch {
          // company name is optional
        }

        passedCount += 1

        const { data: existing, error: existingError } = await supabase
          .from('watchlist')
          .select('ticker')
          .eq('user_id', userId)
          .eq('ticker', ticker)
          .maybeSingle()

        if (existingError) {
          console.error(`[watchlist-screener] Failed to check existing watchlist for ${ticker}:`, existingError)
          rejectionCounts.fetch_error += 1
          await delay(12500)
          continue
        }

        if (existing?.ticker) {
          rejectionCounts.already_in_watchlist += 1
          try {
            const logRowId = candidateLogIds.get(ticker)
            if (logRowId) {
              await supabase
                .from('screener_candidate_log')
                .update({
                  company_name: candidate.companyName,
                  pass2_eps_growth_pct: candidate.epsGrowthPct,
                  pass2_revenue_growth_pct: candidate.revenueGrowthPct,
                  pass2_passed: false,
                  final_passed: false,
                  rejection_reason: 'already_in_watchlist',
                })
                .eq('id', logRowId)
            }
          } catch (logErr) { console.error('[screener-log] Pass 2 already_in_watchlist log failed:', logErr) }
          await delay(12500)
          continue
        }

        // Insert into watchlist — includes rs_line_state, rs_line_confirmed,
        // volume_dry_up_pass calculated from Pass 1 bars (no extra API calls)
        const { data: insertedRow, error: insertError } = await supabase
          .from('watchlist')
          .insert({
            user_id: userId,
            ticker: candidate.ticker,
            company_name: candidate.companyName,
            source: 'automation',
            signal_state: 'candidate',
            status: 'watchlist',
            action_status: 'watchlist',
            setup_type: 'breakout',
            setup_grade: null,
            entry_zone_low: null,
            entry_zone_high: null,
            stop_price: null,
            target_1_price: null,
            target_2_price: null,
            trend_template_pass: true,
            volume_dry_up_pass: shortlisted.volumeDryUpPass,
            rs_line_state: shortlisted.rsLineState,
            rs_line_confirmed: shortlisted.rsLineConfirmed,
            base_pattern_valid: null,
            entry_near_pivot: null,
            volume_breakout_confirmed: null,
            liquidity_pass: true,
            earnings_within_2_weeks: false,
            binary_event_risk: false,
            eps_growth_pct: candidate.epsGrowthPct,
            revenue_growth_pct: candidate.revenueGrowthPct,
            acc_dist_rating: null,
            industry_group_rank: null,
            eps_accelerating: null,
            data_status: 'fresh',
            consecutive_fail_count: 0,
            flagged_for_review: false,
            screener_run_id: logId ?? windowKey,
            screened_price: candidate.price,
            screened_avg_volume: candidate.avgVolume,
            screened_eps_growth_pct: candidate.epsGrowthPct,
            screened_revenue_growth_pct: candidate.revenueGrowthPct,
            screened_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (insertError) {
          console.error(`[watchlist-screener] Failed to insert ${candidate.ticker}:`, insertError.message)
          rejectionCounts.fetch_error += 1
          await delay(12500)
          continue
        }

        try {
          const logRowId = candidateLogIds.get(ticker)
          if (logRowId) {
            await supabase
              .from('screener_candidate_log')
              .update({
                company_name: candidate.companyName,
                pass2_eps_growth_pct: candidate.epsGrowthPct,
                pass2_revenue_growth_pct: candidate.revenueGrowthPct,
                pass2_passed: true,
                final_passed: true,
                rejection_reason: null,
                watchlist_id: insertedRow?.id ?? null,
              })
              .eq('id', logRowId)
          }
        } catch (logErr) { console.error('[screener-log] Final pass log failed:', logErr) }

        addedCount += 1
        addedCandidates.push({
          ticker: candidate.ticker,
          companyName: candidate.companyName,
          epsGrowthPct: candidate.epsGrowthPct,
          revenueGrowthPct: candidate.revenueGrowthPct,
          screenedPrice: candidate.price,
        })

      } catch (error) {
        rejectionCounts.fetch_error += 1
        console.error(`[watchlist-screener] Pass 2 financials fetch failed for ${ticker}:`, error)
      }

      await delay(12500)
    }

    console.log(`[watchlist-screener] Pass 2 complete. Added: ${addedCount}`)

    const stoppedEarly = addedCount >= maxCandidates

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message:
        `Screener completed. Cursor: ${cursorStart}→${cursorEnd} of ${universeSize}. ` +
        `Pass 1: ${pricePassList.length}/${tickersToProcess.length} passed. Added: ${addedCount}.`,
      changesJson: {
        cursor_start: cursorStart,
        cursor_end: cursorEnd,
        universe_size: universeSize,
        pass1_scanned: tickersToProcess.length,
        pass1_price_volume_passed: pricePassList.length,
        pass2_fundamentals_scanned: pricePassList.length,
        pre_filtered_from: rawUniverse.length,
        passed_all_filters: passedCount,
        already_in_watchlist: rejectionCounts.already_in_watchlist,
        added: addedCount,
        stopped_early: stoppedEarly,
        rejection_counts: rejectionCounts,
        windowKey,
      },
    })

    const recipientEmail = settings.notification_email
    if (recipientEmail) {
      try {
        const { subject, html } = screenerComplete({
          date: new Date().toISOString().slice(0, 10),
          addedCount,
          scannedCount: tickersToProcess.length,
          candidates: addedCandidates,
          appUrl: Deno.env.get('APP_BASE_URL') ?? '',
        })

        const emailResult = await sendEmail(
          { to: recipientEmail, subject, html },
          {
            apiKey: Deno.env.get('RESEND_API_KEY') ?? '',
            fromEmail: Deno.env.get('RESEND_FROM_EMAIL') ?? '',
          }
        )

        if (!emailResult.sent) {
          console.error(`[watchlist-screener] Email failed: ${emailResult.reason}`)
        }
      } catch (emailErr) {
        console.error(`[watchlist-screener] Email error:`, emailErr)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cursor_start: cursorStart,
        cursor_end: cursorEnd,
        universe_size: universeSize,
        pass1_scanned: tickersToProcess.length,
        pass1_passed: pricePassList.length,
        pass2_scanned: pricePassList.length,
        added: addedCount,
        stopped_early: stoppedEarly,
        rejection_counts: rejectionCounts,
        windowKey,
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unexpected watchlist screener error'

    await safeFinishScanLog({
      logId,
      status: 'failed',
      message: errorMessage,
    })

    return jsonResponse({ success: false, reason: errorMessage }, 500)
  }
})