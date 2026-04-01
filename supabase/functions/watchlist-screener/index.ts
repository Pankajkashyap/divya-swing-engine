// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateCronSecret } from '../_shared/cronAuth.ts'
import { getCadenceWindowKey } from '../_shared/marketHours.ts'
import { startScanLog, finishScanLog, hasAlreadyProcessed } from '../_shared/scanLog.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const massiveApiKey = Deno.env.get('MASSIVE_API_KEY') ?? ''
const massiveBaseUrl = 'https://api.polygon.io'

type UserSettingsRow = {
  user_id: string
  screener_enabled: boolean | null
  screener_min_price: number | null
  screener_min_avg_volume: number | null
  screener_min_eps_growth_pct: number | null
  screener_min_revenue_growth_pct: number | null
  screener_exchanges: string | null
  screener_max_candidates: number | null
}

type MassiveTicker = {
  ticker?: string
  name?: string | null
  market?: string | null
  primary_exchange?: string | null
}

type AggregateBar = {
  c?: number
  v?: number
  t?: number
}

type FinancialResult = {
  financials?: {
    income_statement?: {
      basic_earnings_per_share?: { value?: number }
      revenues?: { value?: number }
    }
  }
}

type Candidate = {
  ticker: string
  companyName: string | null
  epsGrowthPct: number
  revenueGrowthPct: number
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
  from.setDate(from.getDate() - 5)

  return {
    from: from.toISOString().slice(0, 10),
    to,
  }
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function calculateGrowth(current: number | null, prior: number | null): number | null {
  if (current === null || prior === null || prior === 0) return null
  return Number((((current - prior) / Math.abs(prior)) * 100).toFixed(2))
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

async function massiveGet<T>(path: string, query: Record<string, string>): Promise<T | null> {
  const url = new URL(`${massiveBaseUrl}${path}`)

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value)
  }

  url.searchParams.set('apiKey', massiveApiKey)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Massive request failed (${response.status}): ${text || response.statusText}`)
  }

  return (await response.json()) as T
}

async function fetchReferenceTickers(exchange: string): Promise<MassiveTicker[]> {
  const data = await massiveGet<{ results?: MassiveTicker[] }>('/v3/reference/tickers', {
    market: 'stocks',
    exchange,
    active: 'true',
    limit: '1000',
    sort: 'ticker',
  })

  return data?.results ?? []
}

async function fetchAggregates(
  ticker: string,
  from: string,
  to: string
): Promise<AggregateBar[]> {
  const encodedTicker = encodeURIComponent(ticker)

  const data = await massiveGet<{ results?: AggregateBar[] }>(
    `/v2/aggs/ticker/${encodedTicker}/range/1/day/${from}/${to}`,
    {
      adjusted: 'true',
      sort: 'desc',
      limit: '10',
    }
  )

  return data?.results ?? []
}

async function fetchFinancials(ticker: string): Promise<FinancialResult[]> {
  const data = await massiveGet<{ results?: FinancialResult[] }>('/vX/reference/financials', {
    ticker,
    limit: '2',
    timeframe: 'annual',
    order: 'desc',
  })

  return data?.results ?? []
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
        'user_id, screener_enabled, screener_min_price, screener_min_avg_volume, screener_min_eps_growth_pct, screener_min_revenue_growth_pct, screener_exchanges, screener_max_candidates'
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
      return jsonResponse(
        { skipped: true, reason: 'Screener disabled in settings' },
        200
      )
    }

    if (!massiveApiKey) {
      return jsonResponse(
        { success: false, reason: 'MASSIVE_API_KEY is not configured' },
        500
      )
    }

    const windowKey = getCadenceWindowKey('watchlist-screener')

    const alreadyProcessed = await hasAlreadyProcessed({
      jobType: 'watchlist-screener',
      windowKey,
    })

    if (alreadyProcessed) {
      return jsonResponse(
        { skipped: true, reason: 'Already processed this window' },
        200
      )
    }

    logId = await startScanLog({
      userId,
      jobType: 'watchlist-screener',
      windowKey,
    })

    const exchangeList = (settings.screener_exchanges ?? 'XNAS,XNYS')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    const minPrice = Number(settings.screener_min_price ?? 10)
    const minAvgVolume = Number(settings.screener_min_avg_volume ?? 500000)
    const minEpsGrowth = Number(settings.screener_min_eps_growth_pct ?? 25)
    const minRevenueGrowth = Number(settings.screener_min_revenue_growth_pct ?? 20)
    const maxCandidates = Number(settings.screener_max_candidates ?? 20)

    const tickerMap = new Map<string, MassiveTicker>()

    for (const exchange of exchangeList) {
      try {
        const tickers = await fetchReferenceTickers(exchange)

        for (const ticker of tickers) {
          const symbol = ticker.ticker ?? ''
          if (!symbol) continue
          if (!tickerMap.has(symbol)) {
            tickerMap.set(symbol, ticker)
          }
        }
      } catch (error) {
        console.error(`[watchlist-screener] Failed to fetch reference tickers for ${exchange}:`, error)
      }
    }

    const allTickers = Array.from(tickerMap.values())

    if (allTickers.length === 0) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: 'Ticker reference response was empty',
        changesJson: {
          scanned: 0,
          passed_filters: 0,
          already_in_watchlist: 0,
          added: 0,
          rejection_counts: {},
          windowKey,
        },
      })

      return jsonResponse(
        { success: false, reason: 'Ticker reference response was empty' },
        500
      )
    }

    const filteredTickers = allTickers
      .filter((ticker) => {
        const symbol = ticker.ticker ?? ''
        const exchange = ticker.primary_exchange ?? ''

        if (ticker.market !== 'stocks') return false
        if (!symbol || symbol.includes('.')) return false
        if (symbol.length > 5) return false
        if (!exchangeList.includes(exchange)) return false

        return true
      })
      .slice(0, 120)

    const { from, to } = getRecentTradingDateRange()

    let scanned = 0
    let passedFilters = 0
    const candidates: Candidate[] = []

    const rejectionCounts = {
      price: 0,
      volume: 0,
      missingEps: 0,
      lowEps: 0,
      missingRevenue: 0,
      lowRevenue: 0,
      fetchError: 0,
    }

    for (const tickerDetail of filteredTickers) {
      if (candidates.length >= maxCandidates) break

      const ticker = tickerDetail.ticker ?? ''
      if (!ticker) continue

      scanned += 1

      try {
        const [bars, financialResults] = await Promise.all([
          fetchAggregates(ticker, from, to),
          fetchFinancials(ticker),
        ])

        const sortedBars = [...bars].sort((a, b) => (b.t ?? 0) - (a.t ?? 0))
        const latestBar = sortedBars[0]
        const latestClose = toNumberOrNull(latestBar?.c)
        const latestVolume = toNumberOrNull(latestBar?.v)

        if (latestClose === null || latestClose < minPrice) {
          rejectionCounts.price += 1
          continue
        }

        if (latestVolume === null || latestVolume < minAvgVolume) {
          rejectionCounts.volume += 1
          continue
        }

        const currentEps = toNumberOrNull(
          financialResults[0]?.financials?.income_statement?.basic_earnings_per_share?.value
        )
        const priorEps = toNumberOrNull(
          financialResults[1]?.financials?.income_statement?.basic_earnings_per_share?.value
        )
        const currentRevenue = toNumberOrNull(
          financialResults[0]?.financials?.income_statement?.revenues?.value
        )
        const priorRevenue = toNumberOrNull(
          financialResults[1]?.financials?.income_statement?.revenues?.value
        )

        const epsGrowthPct = calculateGrowth(currentEps, priorEps)
        const revenueGrowthPct = calculateGrowth(currentRevenue, priorRevenue)

        if (epsGrowthPct === null) {
          rejectionCounts.missingEps += 1
          continue
        }

        if (epsGrowthPct < minEpsGrowth) {
          rejectionCounts.lowEps += 1
          continue
        }

        if (revenueGrowthPct === null) {
          rejectionCounts.missingRevenue += 1
          continue
        }

        if (revenueGrowthPct < minRevenueGrowth) {
          rejectionCounts.lowRevenue += 1
          continue
        }

        passedFilters += 1

        candidates.push({
          ticker,
          companyName: tickerDetail.name ?? null,
          epsGrowthPct,
          revenueGrowthPct,
        })
      } catch (error) {
        rejectionCounts.fetchError += 1
        console.error(`[watchlist-screener] Skipping ${ticker} due to fetch error:`, error)
        continue
      }
    }

    const candidateTickers = candidates.map((candidate) => candidate.ticker)

    if (candidateTickers.length === 0) {
      await safeFinishScanLog({
        logId,
        status: 'completed',
        message: 'Watchlist screener completed. No candidates passed filters.',
        changesJson: {
          scanned,
          passed_filters: 0,
          already_in_watchlist: 0,
          added: 0,
          rejection_counts: rejectionCounts,
          windowKey,
        },
      })

      return jsonResponse(
        {
          success: true,
          scanned,
          passed_filters: 0,
          already_in_watchlist: 0,
          added: 0,
          rejection_counts: rejectionCounts,
          windowKey,
        },
        200
      )
    }

    const { data: existing, error: existingError } = await supabase
      .from('watchlist')
      .select('ticker')
      .eq('user_id', userId)
      .in('ticker', candidateTickers)

    if (existingError) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to check existing watchlist entries: ${existingError.message}`,
      })

      return jsonResponse(
        { success: false, reason: 'Failed to check existing watchlist entries' },
        500
      )
    }

    const existingTickers = new Set((existing ?? []).map((row) => row.ticker))
    const newCandidates = candidates.filter((candidate) => !existingTickers.has(candidate.ticker))
    const alreadyInWatchlist = candidates.length - newCandidates.length

    let added = 0

    for (const candidate of newCandidates) {
      const { error: insertError } = await supabase.from('watchlist').insert({
        user_id: userId,
        ticker: candidate.ticker,
        company_name: candidate.companyName,
        source: 'automation',
        signal_state: 'candidate',
        status: 'watchlist',
        action_status: 'watchlist',
        setup_type: 'other',
        setup_grade: null,
        entry_zone_low: null,
        entry_zone_high: null,
        stop_price: null,
        target_1_price: null,
        target_2_price: null,
        trend_template_pass: false,
        volume_dry_up_pass: false,
        rs_line_confirmed: false,
        base_pattern_valid: false,
        entry_near_pivot: false,
        volume_breakout_confirmed: false,
        liquidity_pass: false,
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
      })

      if (insertError) {
        console.error(`[watchlist-screener] Failed to insert ${candidate.ticker}:`, insertError.message)
        continue
      }

      added += 1
    }

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message: `Watchlist screener completed. Scanned: ${scanned}, passed: ${passedFilters}, existing: ${alreadyInWatchlist}, added: ${added}`,
      changesJson: {
        scanned,
        passed_filters: passedFilters,
        already_in_watchlist: alreadyInWatchlist,
        added,
        rejection_counts: rejectionCounts,
        windowKey,
      },
    })

    return jsonResponse(
      {
        success: true,
        scanned,
        passed_filters: passedFilters,
        already_in_watchlist: alreadyInWatchlist,
        added,
        rejection_counts: rejectionCounts,
        windowKey,
      },
      200
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