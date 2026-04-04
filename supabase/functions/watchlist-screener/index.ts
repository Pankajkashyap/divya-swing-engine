// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateCronSecret } from '../_shared/cronAuth.ts'
import { getCadenceWindowKey } from '../_shared/marketHours.ts'
import { startScanLog, finishScanLog, hasAlreadyProcessed } from '../_shared/scanLog.ts'
import { TICKER_UNIVERSE } from '../_shared/ticker-universe.ts'

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
  epsGrowthPct: number | null
  revenueGrowthPct: number | null
}

type PricePassCandidate = {
  ticker: string
  price: number
  volume: number
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
      return jsonResponse({ skipped: true, reason: 'Screener disabled in settings' }, 200)
    }

    if (!massiveApiKey) {
      return jsonResponse({ success: false, reason: 'MASSIVE_API_KEY is not configured' }, 500)
    }

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

    const minPrice = Number(settings.screener_min_price ?? 10)
    const minAvgVolume = Number(settings.screener_min_avg_volume ?? 500000)
    const minEpsGrowth = Number(settings.screener_min_eps_growth_pct ?? 25)
    const minRevenueGrowth = Number(settings.screener_min_revenue_growth_pct ?? 20)
    const maxCandidates = Number(settings.screener_max_candidates ?? 20)

    const preFiltered = TICKER_UNIVERSE.filter((ticker) => {
      if (ticker.endsWith('W') || ticker.endsWith('U') || ticker.endsWith('R')) return false
      if (ticker.includes('.')) return false
      if (ticker.length < 2 || ticker.length > 5) return false
      return true
    })

    const targetScanCount = Math.min(maxCandidates * 2, 8)
    const shuffled = [...preFiltered].sort(() => Math.random() - 0.5)
    const tickersToProcess = shuffled.slice(0, targetScanCount)

    const { from, to } = getRecentTradingDateRange()

    let passedCount = 0
    let addedCount = 0
    const rejectionCounts = {
      fetch_error: 0,
      price_too_low: 0,
      volume_too_low: 0,
      eps_too_low: 0,
      already_in_watchlist: 0,
      zero_fundamentals: 0,
    }

    const pricePassList: PricePassCandidate[] = []

    console.log(
      `[watchlist-screener] Pass 1 starting. Deep-processing ${tickersToProcess.length} tickers from static universe of ${TICKER_UNIVERSE.length}.`
    )

    for (const ticker of tickersToProcess) {
      if (pricePassList.length >= maxCandidates * 3) {
        console.log(
          `[watchlist-screener] Pass 1 reached shortlist target (${maxCandidates * 3}). Stopping early.`
        )
        break
      }

      try {
        const aggregateUrl =
          `${massiveBaseUrl}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}` +
          `?adjusted=true&sort=desc&limit=5&apiKey=${massiveApiKey}`

        const aggResponse = await fetchWithTimeout(aggregateUrl, {}, 5000)

        if (!aggResponse.ok) {
          rejectionCounts.fetch_error += 1
          await delay(12500)
          continue
        }

        const aggJson = (await aggResponse.json()) as { results?: AggregateBar[] }
        const bars = aggJson.results ?? []

        if (bars.length === 0) {
          rejectionCounts.fetch_error += 1
          await delay(12500)
          continue
        }

        const sortedBars = [...bars].sort((a, b) => (b.t ?? 0) - (a.t ?? 0))
        const latestBar = sortedBars[0]
        const price = toNumberOrNull(latestBar?.c)
        const volume = toNumberOrNull(latestBar?.v)

        if (price === null) {
          rejectionCounts.fetch_error += 1
          await delay(12500)
          continue
        }

        if (price < minPrice) {
          rejectionCounts.price_too_low += 1
          await delay(12500)
          continue
        }

        if (volume === null) {
          rejectionCounts.fetch_error += 1
          await delay(12500)
          continue
        }

        if (volume < minAvgVolume) {
          rejectionCounts.volume_too_low += 1
          await delay(12500)
          continue
        }

        pricePassList.push({
          ticker,
          price,
          volume,
        })
      } catch (error) {
        rejectionCounts.fetch_error += 1
        console.error(`[watchlist-screener] Pass 1 aggregate fetch failed for ${ticker}:`, error)
      }

      await delay(12500)
    }

    console.log(
      `[watchlist-screener] Pass 1 complete. Price/volume passed: ${pricePassList.length} of ${tickersToProcess.length}`
    )

    console.log(
      `[watchlist-screener] Pass 2 starting. Fundamentals screening for ${pricePassList.length} shortlisted tickers.`
    )

    for (const shortlisted of pricePassList) {
      if (addedCount >= maxCandidates) {
        console.log(`[watchlist-screener] Reached max candidates (${maxCandidates}). Stopping early.`)
        break
      }

      const ticker = shortlisted.ticker

      try {
        const financialsUrl =
          `${massiveBaseUrl}/vX/reference/financials?ticker=${encodeURIComponent(ticker)}` +
          `&timeframe=annual&order=desc&limit=2&apiKey=${massiveApiKey}`

        const finResponse = await fetchWithTimeout(financialsUrl, {}, 8000)

        if (!finResponse.ok) {
          rejectionCounts.fetch_error += 1
          await delay(300)
          continue
        }

        const finJson = (await finResponse.json()) as { results?: FinancialResult[] }
        const financialResults = finJson.results ?? []

        if (financialResults.length === 0) {
          rejectionCounts.fetch_error += 1
          await delay(300)
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

        const epsGrowth = calculateGrowth(currentEps, priorEps)
        const revenueGrowth = calculateGrowth(currentRevenue, priorRevenue)

        const hasValidFundamentals =
          (epsGrowth !== null && epsGrowth > 0) ||
          (revenueGrowth !== null && revenueGrowth > 0)

        if (!hasValidFundamentals) {
          rejectionCounts.zero_fundamentals += 1
          await delay(300)
          continue
        }

        if (
          (epsGrowth === null || epsGrowth <= minEpsGrowth) &&
          (revenueGrowth === null || revenueGrowth <= minRevenueGrowth)
        ) {
          rejectionCounts.eps_too_low += 1
          await delay(300)
          continue
        }

        let companyName: string | null = null
        try {
          const detailUrl =
            `${massiveBaseUrl}/v3/reference/tickers/${encodeURIComponent(ticker)}` +
            `?apiKey=${massiveApiKey}`
          const detailResponse = await fetchWithTimeout(detailUrl, {}, 5000)
          if (detailResponse.ok) {
            const detailData = await detailResponse.json()
            companyName = detailData?.results?.name ?? null
          }
        } catch {
          // company name is optional — continue without it
        }

        passedCount += 1

        const { data: existing, error: existingError } = await supabase
          .from('watchlist')
          .select('ticker')
          .eq('user_id', userId)
          .eq('ticker', ticker)
          .maybeSingle()

        if (existingError) {
          console.error(
            `[watchlist-screener] Failed to check existing watchlist entry for ${ticker}:`,
            existingError
          )
          rejectionCounts.fetch_error += 1
          await delay(300)
          continue
        }

        if (existing?.ticker) {
          rejectionCounts.already_in_watchlist += 1
          await delay(300)
          continue
        }

        const candidate: Candidate = {
          ticker,
          companyName,
          epsGrowthPct: epsGrowth,
          revenueGrowthPct: revenueGrowth,
        }

        const { error: insertError } = await supabase.from('watchlist').insert({
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
          trend_template_pass: null,
          volume_dry_up_pass: null,
          rs_line_confirmed: null,
          base_pattern_valid: null,
          entry_near_pivot: null,
          volume_breakout_confirmed: null,
          liquidity_pass: null,
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
          rejectionCounts.fetch_error += 1
          await delay(300)
          continue
        }

        addedCount += 1
      } catch (error) {
        rejectionCounts.fetch_error += 1
        console.error(`[watchlist-screener] Pass 2 financials fetch failed for ${ticker}:`, error)
      }

      await delay(300)
    }

    console.log(`[watchlist-screener] Pass 2 complete. Added: ${addedCount}`)

    const stoppedEarly = addedCount >= maxCandidates

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message:
        `Watchlist screener completed. Pass 1 scanned ${tickersToProcess.length}, ` +
        `price/volume passed ${pricePassList.length}, pass 2 added ${addedCount}.`,
      changesJson: {
        pass1_scanned: tickersToProcess.length,
        pass1_price_volume_passed: pricePassList.length,
        pass2_fundamentals_scanned: pricePassList.length,
        pre_filtered_from: TICKER_UNIVERSE.length,
        passed_all_filters: passedCount,
        already_in_watchlist: rejectionCounts.already_in_watchlist,
        added: addedCount,
        stopped_early: stoppedEarly,
        rejection_counts: rejectionCounts,
        windowKey,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
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
})// force redeploy static universe fix
// force redeploy universe export fix
