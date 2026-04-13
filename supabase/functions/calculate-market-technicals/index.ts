// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateCronSecret } from '../_shared/cronAuth.ts'
import {
  getCadenceWindowKey,
} from '../_shared/marketHours.ts'
import {
  startScanLog,
  finishScanLog,
  hasAlreadyProcessed,
} from '../_shared/scanLog.ts'
import { edgeConfig } from '../_shared/config.ts'

const supabaseUrl = edgeConfig.supabaseUrl
const serviceRoleKey = edgeConfig.supabaseServiceRoleKey

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null

const SECTOR_ETFS: Record<string, string> = {
  XLE: 'Energy',
  XLK: 'Technology',
  XLF: 'Financials',
  XLV: 'Healthcare',
  XLI: 'Industrials',
  XLY: 'Consumer Discretionary',
  XLP: 'Consumer Staples',
  XLU: 'Utilities',
  XLB: 'Materials',
  XLRE: 'Real Estate',
  XLC: 'Communication Services',
}

type PolygonAggBar = {
  c: number
  v: number
  l: number
  t: number
}

type FtdState = {
  ftdActive: boolean
  ftdInvalidated: boolean
  ftdDate: string | null
  ftdDay1Low: number | null
}

function jsonResponse(payload: unknown, statusCode: number): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status: statusCode,
  })
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

function getTodayDateString(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA')
}

function getDateDaysAgo(daysAgo: number, now: Date = new Date()): string {
  const date = new Date(now)
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function calculateSma(closes: number[], period: number, endExclusive?: number): number {
  const end = endExclusive ?? closes.length
  const start = end - period
  return average(closes.slice(start, end))
}

function countDistributionDays(closes: number[], volumes: number[]): number {
  let count = 0
  const startIndex = Math.max(1, closes.length - 25)

  for (let i = startIndex; i < closes.length; i += 1) {
    const pctChange = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100
    if (pctChange <= -0.2 && volumes[i] > volumes[i - 1]) {
      count += 1
    }
  }

  return count
}

function formatBarDate(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10)
}

function runFtdDetectionOnBars(bars: PolygonAggBar[]): {
  found: boolean
  ftdDate: string | null
  ftdDay1Low: number | null
} {
  const recentBars = bars.slice(-90)
  if (recentBars.length < 10) {
    return { found: false, ftdDate: null, ftdDay1Low: null }
  }

  const closes = recentBars.map((bar) => bar.c)
  const lows = recentBars.map((bar) => bar.l)
  const volumes = recentBars.map((bar) => bar.v)

  const findDay1Index = (endIndex: number): number | null => {
    for (let i = endIndex; i >= 1; i -= 1) {
      if (closes[i] <= closes[i - 1]) continue

      const day1Low = lows[i]
      let valid = true

      for (let j = i + 1; j <= endIndex; j += 1) {
        if (lows[j] < day1Low) {
          valid = false
          break
        }
      }

      if (valid) return i
    }

    return null
  }

  let searchEndIndex = closes.length - 1

  while (searchEndIndex >= 4) {
    const day1Index = findDay1Index(searchEndIndex)
    if (day1Index === null) break

    const day1Low = lows[day1Index]
    let dayCount = 1
    let restartAtIndex: number | null = null

    for (let j = day1Index + 1; j <= searchEndIndex; j += 1) {
      dayCount += 1

      if (lows[j] < day1Low) {
        restartAtIndex = j
        break
      }

      if (dayCount >= 4) {
        const pctChange = ((closes[j] - closes[j - 1]) / closes[j - 1]) * 100
        if (pctChange >= 1.7 && volumes[j] > volumes[j - 1]) {
          return {
            found: true,
            ftdDate: formatBarDate(recentBars[j].t),
            ftdDay1Low: day1Low,
          }
        }
      }
    }

    if (restartAtIndex !== null) {
      searchEndIndex = restartAtIndex
      continue
    }

    break
  }

  return { found: false, ftdDate: null, ftdDay1Low: null }
}

function isFtdInvalidated(
  bars: PolygonAggBar[],
  ftdDate: string | null,
  ftdDay1Low: number | null
): boolean {
  if (!ftdDate || ftdDay1Low === null) return false

  const ftdIndex = bars.findIndex((bar) => formatBarDate(bar.t) === ftdDate)
  if (ftdIndex === -1) return false

  for (let i = ftdIndex + 1; i < bars.length; i += 1) {
    if (bars[i].l < ftdDay1Low) {
      return true
    }
  }

  return false
}

function resolveFtdState(params: {
  spyBars: PolygonAggBar[]
  qqqBars: PolygonAggBar[]
  existingFtdDate: string | null
  existingDay1Low: number | null
}): FtdState {
  const { spyBars, qqqBars, existingFtdDate, existingDay1Low } = params

  const spyCloses = spyBars.map((bar) => bar.c)
  const recentHigh = Math.max(...spyCloses.slice(-60))
  const currentClose = spyCloses[spyCloses.length - 1]
  const inDecline = currentClose < recentHigh * 0.95

  console.log('[calculate-market-technicals] FTD decline check', {
    recentHigh,
    currentClose,
    inDecline,
  })

  let ftdDate: string | null = null
  let ftdDay1Low: number | null = null
  let ftdActive = false
  let ftdInvalidated = false

  if (!inDecline) {
    console.log(
      '[calculate-market-technicals] Not in decline, checking existing FTD state'
    )

    if (existingFtdDate && existingDay1Low !== null) {
      const invalidated =
        isFtdInvalidated(spyBars, existingFtdDate, existingDay1Low) ||
        isFtdInvalidated(qqqBars, existingFtdDate, existingDay1Low)

      ftdDate = existingFtdDate
      ftdDay1Low = existingDay1Low
      ftdActive = !invalidated
      ftdInvalidated = invalidated
    }

    return {
      ftdActive,
      ftdInvalidated,
      ftdDate,
      ftdDay1Low,
    }
  }

  console.log('[calculate-market-technicals] In decline, scanning for new FTD')

  const spyFtd = runFtdDetectionOnBars(spyBars)
  const qqqFtd = runFtdDetectionOnBars(qqqBars)

  console.log('[calculate-market-technicals] FTD candidates', {
    spyFtd,
    qqqFtd,
  })

  if (spyFtd.found && qqqFtd.found) {
    if (spyFtd.ftdDate! <= qqqFtd.ftdDate!) {
      ftdDate = spyFtd.ftdDate
      ftdDay1Low = spyFtd.ftdDay1Low
    } else {
      ftdDate = qqqFtd.ftdDate
      ftdDay1Low = qqqFtd.ftdDay1Low
    }
  } else if (spyFtd.found) {
    ftdDate = spyFtd.ftdDate
    ftdDay1Low = spyFtd.ftdDay1Low
  } else if (qqqFtd.found) {
    ftdDate = qqqFtd.ftdDate
    ftdDay1Low = qqqFtd.ftdDay1Low
  }

  if (!ftdDate || ftdDay1Low === null) {
    return {
      ftdActive: false,
      ftdInvalidated: false,
      ftdDate: null,
      ftdDay1Low: null,
    }
  }

  const invalidated =
    isFtdInvalidated(spyBars, ftdDate, ftdDay1Low) ||
    isFtdInvalidated(qqqBars, ftdDate, ftdDay1Low)

  return {
    ftdActive: !invalidated,
    ftdInvalidated: invalidated,
    ftdDate,
    ftdDay1Low,
  }
}

async function fetchPolygonBars(
  ticker: 'SPY' | 'QQQ',
  polygonApiKey: string,
  from: string,
  to: string
): Promise<{ bars: PolygonAggBar[]; status: number }> {
  const url =
    `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}` +
    `?adjusted=true&sort=asc&limit=300&apiKey=${polygonApiKey}`

  console.log(`[calculate-market-technicals] Fetching ${ticker} bars`, { from, to })

  const response = await fetch(url)
  if (response.status === 429) {
    console.error(`[calculate-market-technicals] Polygon rate limited for ${ticker}`)
    return { bars: [], status: 429 }
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Polygon ${ticker} fetch failed: ${response.status} ${text}`)
  }

  const json = await response.json()
  const bars = Array.isArray(json?.results)
    ? (json.results as PolygonAggBar[])
    : []

  return { bars, status: response.status }
}

async function fetchSectorReturn(
  polygonApiKey: string,
  ticker: string,
  sectorName: string,
  from: string,
  to: string
): Promise<{ sector: string; pctReturn: number } | null> {
  try {
    const url =
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}` +
      `?adjusted=true&sort=asc&limit=50&apiKey=${polygonApiKey}`

    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`[calculate-market-technicals] Failed to fetch ${ticker}:`, response.status)
      return null
    }

    const json = await response.json()
    const bars = Array.isArray(json?.results) ? json.results : []

    if (bars.length < 2) {
      console.warn(`[calculate-market-technicals] Insufficient bars for ${ticker}`)
      return null
    }

    const firstClose = bars[0].c
    const lastClose = bars[bars.length - 1].c

    if (typeof firstClose !== 'number' || typeof lastClose !== 'number' || firstClose === 0) {
      console.warn(`[calculate-market-technicals] Invalid close values for ${ticker}`)
      return null
    }

    const pctReturn = ((lastClose - firstClose) / firstClose) * 100

    console.log(`[calculate-market-technicals] ${ticker} (${sectorName}): ${pctReturn.toFixed(2)}%`)

    return { sector: sectorName, pctReturn }
  } catch (err) {
    console.warn(`[calculate-market-technicals] Error fetching ${ticker}:`, err)
    return null
  }
}

async function calculateLeadingSectors(
  polygonApiKey: string,
  from: string,
  to: string
): Promise<string | null> {
  const settled = await Promise.all(
    Object.entries(SECTOR_ETFS).map(([ticker, sectorName]) =>
      fetchSectorReturn(polygonApiKey, ticker, sectorName, from, to)
    )
  )

  const results = settled.filter(
    (item): item is { sector: string; pctReturn: number } => item !== null
  )

  if (results.length === 0) return null

  results.sort((a, b) => b.pctReturn - a.pctReturn)
  const top3 = results.slice(0, 3).map((r) => r.sector)

  return top3.join(', ')
}

Deno.serve(async (request: Request) => {
  let logId: string | null = null

  try {
    const authResult = validateCronSecret(request)

    if (!authResult.authorised) {
      return jsonResponse(
        { success: false, reason: authResult.reason },
        401
      )
    }

    if (!supabase) {
      return jsonResponse(
        { success: false, reason: 'Supabase environment not configured' },
        500
      )
    }

    const polygonApiKey = Deno.env.get('POLYGON_API_KEY') ?? ''
    if (!polygonApiKey) {
      return jsonResponse(
        { success: false, reason: 'POLYGON_API_KEY not configured' },
        500
      )
    }

    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('user_id, timezone')
      .limit(1)
      .maybeSingle()

    if (settingsError) {
      return jsonResponse(
        {
          success: false,
          reason: `Failed to load user settings: ${settingsError.message}`,
        },
        500
      )
    }

    if (!userSettings?.user_id) {
      return jsonResponse(
        { success: false, reason: 'No user settings found' },
        500
      )
    }

    const userId = userSettings.user_id
    const windowKey = getCadenceWindowKey('calculate-market-technicals')

    const alreadyProcessed = await hasAlreadyProcessed({
      jobType: 'calculate-market-technicals',
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
      jobType: 'calculate-market-technicals',
      windowKey,
    })

    const today = getTodayDateString()
    const from = getDateDaysAgo(400)

    console.log('[calculate-market-technicals] Starting Polygon fetches')

    const [spyResult, qqqResult] = await Promise.all([
      fetchPolygonBars('SPY', polygonApiKey, from, today),
      fetchPolygonBars('QQQ', polygonApiKey, from, today),
    ])

    if (spyResult.status === 429 || qqqResult.status === 429) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: 'Polygon rate limited',
      })

      return jsonResponse(
        { success: false, reason: 'Polygon rate limited' },
        429
      )
    }

    const spyBars = spyResult.bars
    const qqqBars = qqqResult.bars

    console.log('[calculate-market-technicals] Polygon fetch complete', {
      spyBars: spyBars.length,
      qqqBars: qqqBars.length,
    })

    if (spyBars.length < 230 || qqqBars.length < 230) {
      console.warn('[calculate-market-technicals] Insufficient bar count', {
        spyBars: spyBars.length,
        qqqBars: qqqBars.length,
      })

      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Insufficient bar count. SPY: ${spyBars.length}, QQQ: ${qqqBars.length}`,
      })

      return jsonResponse(
        {
          success: false,
          reason: `Insufficient Polygon bars. SPY: ${spyBars.length}, QQQ: ${qqqBars.length}`,
        },
        400
      )
    }

    console.log('[calculate-market-technicals] Waiting 15s before sector ETF calls for Polygon free-tier rate limits')
    await new Promise((resolve) => setTimeout(resolve, 15000))

    console.log('[calculate-market-technicals] Calculating moving averages')

    const closes = spyBars.map((bar) => bar.c)
    const volumes = spyBars.map((bar) => bar.v)
    const n = closes.length

    const sma50 = calculateSma(closes, 50)
    const sma150 = calculateSma(closes, 150)
    const sma200 = calculateSma(closes, 200)
    const todayClose = closes[n - 1]

    const spy_above_50dma = todayClose > sma50
    const spy_above_150dma = todayClose > sma150
    const spy_above_200dma = todayClose > sma200

    const sma200_today = calculateSma(closes, 200)
    const sma200_30ago = calculateSma(closes, 200, n - 30)
    const spy_200dma_trending_up = sma200_today > sma200_30ago

    console.log('[calculate-market-technicals] Calculating distribution days')
    const distribution_days = countDistributionDays(closes, volumes)

    console.log('[calculate-market-technicals] Loading existing FTD state')
    const { data: latestSnapshot, error: latestSnapshotError } = await supabase
      .from('market_snapshots')
      .select('ftd_date, rally_attempt_day1_low')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestSnapshotError) {
      throw new Error(`Failed to load existing FTD state: ${latestSnapshotError.message}`)
    }

    console.log('[calculate-market-technicals] Resolving FTD state')
    const ftdState = resolveFtdState({
      spyBars,
      qqqBars,
      existingFtdDate: latestSnapshot?.ftd_date ?? null,
      existingDay1Low:
        latestSnapshot?.rally_attempt_day1_low !== null &&
        latestSnapshot?.rally_attempt_day1_low !== undefined
          ? Number(latestSnapshot.rally_attempt_day1_low)
          : null,
    })

    console.log('[calculate-market-technicals] Calculating sector leadership')
    const leading_sectors = await calculateLeadingSectors(
      polygonApiKey,
      getDateDaysAgo(35),
      today
    )
    console.log('[calculate-market-technicals] Leading sectors:', leading_sectors)

    const technicalsCalculatedAt = new Date().toISOString()
    const payload = {
      user_id: userId,
      snapshot_date: new Date().toLocaleDateString('en-CA'),
      spy_above_50dma,
      spy_above_150dma,
      spy_above_200dma,
      spy_200dma_trending_up,
      distribution_days,
      ftd_active: ftdState.ftdActive,
      ftd_invalidated: ftdState.ftdInvalidated,
      ftd_date: ftdState.ftdDate,
      rally_attempt_day1_low: ftdState.ftdDay1Low ?? null,
      leading_sectors: leading_sectors ?? null,
      technicals_calculated_at: technicalsCalculatedAt,
      source: 'automation',
    }

    console.log('[calculate-market-technicals] Writing market_snapshots row', payload)

    const { error: upsertError } = await supabase
      .from('market_snapshots')
      .upsert(payload, { onConflict: 'snapshot_date' })

    if (upsertError) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Snapshot upsert failed: ${upsertError.message}`,
      })

      return jsonResponse(
        { success: false, reason: 'DB write failed' },
        200
      )
    }

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message: 'Market technicals calculated successfully',
      changesJson: {
        spy_above_50dma,
        spy_above_150dma,
        spy_above_200dma,
        spy_200dma_trending_up,
        distribution_days,
        ftd_active: ftdState.ftdActive,
        ftd_invalidated: ftdState.ftdInvalidated,
        ftd_date: ftdState.ftdDate,
        rally_attempt_day1_low: ftdState.ftdDay1Low ?? null,
        leading_sectors: leading_sectors ?? null,
        technicals_calculated_at: technicalsCalculatedAt,
        windowKey,
      },
    })

    return jsonResponse(
      {
        success: true,
        snapshot_date: payload.snapshot_date,
        spy_above_50dma,
        spy_above_150dma,
        spy_above_200dma,
        spy_200dma_trending_up,
        distribution_days,
        ftd_active: ftdState.ftdActive,
        ftd_invalidated: ftdState.ftdInvalidated,
        ftd_date: ftdState.ftdDate,
        rally_attempt_day1_low: ftdState.ftdDay1Low ?? null,
        leading_sectors: leading_sectors ?? null,
        technicals_calculated_at: technicalsCalculatedAt,
        windowKey,
      },
      200
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unexpected calculate-market-technicals error'

    console.error('[calculate-market-technicals] Fatal error', error)

    await safeFinishScanLog({
      logId,
      status: 'failed',
      message: errorMessage,
    })

    return jsonResponse(
      { success: false, reason: errorMessage },
      500
    )
  }
})