import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { appConfig } from '@/lib/config'

type MarketPhase =
  | 'confirmed_uptrend'
  | 'under_pressure'
  | 'rally_attempt'
  | 'correction'
  | 'bear'

type RawMarketData = {
  spy_price: number
  spy_change_pct: number
  new_highs_count: number | null
  new_lows_count: number | null
  leading_sectors: string
}

type TechnicalRow = {
  spy_above_50dma: boolean | null
  spy_above_150dma: boolean | null
  spy_above_200dma: boolean | null
  spy_200dma_trending_up: boolean | null
  distribution_days: number | null
  ftd_active: boolean | null
  ftd_invalidated: boolean | null
}

type MarketPhaseResult = {
  market_phase: MarketPhase
  max_long_exposure_pct: 0 | 25 | 50 | 100
}

async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value, ...(options as object) })
      },
      remove(name: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value: '', ...(options as object), maxAge: 0 })
      },
    },
  })
}

function deriveMarketPhase(params: {
  spy_above_50dma: boolean
  spy_above_150dma: boolean
  spy_above_200dma: boolean
  spy_200dma_trending_up: boolean
  distribution_days: number
  ftd_active: boolean
  ftd_invalidated: boolean
  new_highs_count: number | null
  new_lows_count: number | null
}): MarketPhaseResult {
  const {
    spy_above_50dma,
    spy_above_150dma,
    spy_above_200dma,
    spy_200dma_trending_up,
    distribution_days,
    ftd_active,
    ftd_invalidated,
    new_highs_count,
    new_lows_count,
  } = params

  if (
    !spy_above_50dma &&
    !spy_above_150dma &&
    !spy_above_200dma &&
    !spy_200dma_trending_up
  ) {
    return { market_phase: 'bear', max_long_exposure_pct: 0 }
  }

  if (
    ftd_invalidated ||
    distribution_days >= 5 ||
    (!spy_above_50dma && !spy_above_150dma)
  ) {
    return { market_phase: 'correction', max_long_exposure_pct: 0 }
  }

  if (!ftd_active) {
    return { market_phase: 'rally_attempt', max_long_exposure_pct: 25 }
  }

  if (distribution_days >= 4 || !spy_above_50dma || !spy_above_150dma) {
    return { market_phase: 'under_pressure', max_long_exposure_pct: 50 }
  }

  if (
    new_highs_count !== null &&
    new_lows_count !== null &&
    new_lows_count > new_highs_count
  ) {
    return { market_phase: 'under_pressure', max_long_exposure_pct: 50 }
  }

  return { market_phase: 'confirmed_uptrend', max_long_exposure_pct: 100 }
}

function isValidRawData(body: unknown): body is RawMarketData {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>

  const validNewHighs =
    b.new_highs_count === null ||
    (typeof b.new_highs_count === 'number' &&
      Number.isInteger(b.new_highs_count) &&
      b.new_highs_count >= 0)

  const validNewLows =
    b.new_lows_count === null ||
    (typeof b.new_lows_count === 'number' &&
      Number.isInteger(b.new_lows_count) &&
      b.new_lows_count >= 0)

  return (
    typeof b.spy_price === 'number' &&
    Number.isFinite(b.spy_price) &&
    b.spy_price > 0 &&
    typeof b.spy_change_pct === 'number' &&
    Number.isFinite(b.spy_change_pct) &&
    validNewHighs &&
    validNewLows &&
    typeof b.leading_sectors === 'string' &&
    b.leading_sectors.trim().length > 0
  )
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (!isValidRawData(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const today = new Date().toLocaleDateString('en-CA')

  const { data: technicals, error: technicalsError } = await supabase
    .from('market_snapshots')
    .select(
      'spy_above_50dma, spy_above_150dma, spy_above_200dma, spy_200dma_trending_up, distribution_days, ftd_active, ftd_invalidated'
    )
    .eq('snapshot_date', today)
    .maybeSingle()

  if (technicalsError) {
    return NextResponse.json({ error: technicalsError.message }, { status: 500 })
  }

  if (!technicals) {
    return NextResponse.json(
      { error: 'Market technicals not yet calculated for today.' },
      { status: 400 }
    )
  }

  const typedTechnicals = technicals as TechnicalRow

  const {
    spy_above_50dma,
    spy_above_150dma,
    spy_above_200dma,
    spy_200dma_trending_up,
    distribution_days,
    ftd_active,
    ftd_invalidated,
  } = typedTechnicals

  if (
    spy_above_50dma === null ||
    spy_above_150dma === null ||
    spy_above_200dma === null ||
    spy_200dma_trending_up === null ||
    distribution_days === null ||
    ftd_active === null ||
    ftd_invalidated === null
  ) {
    return NextResponse.json(
      { error: 'Market technicals incomplete for today.' },
      { status: 400 }
    )
  }

  const { market_phase, max_long_exposure_pct } = deriveMarketPhase({
    spy_above_50dma,
    spy_above_150dma,
    spy_above_200dma,
    spy_200dma_trending_up,
    distribution_days,
    ftd_active,
    ftd_invalidated,
    new_highs_count: body.new_highs_count,
    new_lows_count: body.new_lows_count,
  })

  const snapshot_date = today
  const last_market_scan_at = new Date().toISOString()

  const payload = {
    snapshot_date,
    user_id: user.id,
    spy_price: body.spy_price,
    spy_change_pct: body.spy_change_pct,
    new_highs_count: body.new_highs_count,
    new_lows_count: body.new_lows_count,
    leading_sectors: body.leading_sectors,
    market_phase,
    max_long_exposure_pct,
    source: 'automation',
    last_market_scan_at,
  }

  const { error } = await supabase
    .from('market_snapshots')
    .upsert(payload, { onConflict: 'snapshot_date' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    snapshot_date,
    market_phase,
    max_long_exposure_pct,
    spy_above_50dma,
    spy_above_150dma,
    spy_above_200dma,
    spy_200dma_trending_up,
    distribution_days,
    ftd_active,
    ftd_invalidated,
  })
}