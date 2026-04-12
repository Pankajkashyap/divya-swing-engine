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
  spy_above_50dma: boolean
  spy_above_150dma: boolean
  spy_above_200dma: boolean
  spy_200dma_trending_up: boolean
  distribution_days: number
  ftd_active: boolean
  ftd_invalidated: boolean
  new_highs_count: number
  new_lows_count: number
  leading_sectors: string
}

type MarketPhaseResult = {
  market_phase: MarketPhase
  max_long_exposure_pct: 0 | 25 | 50 | 100
  reasoning: string
}

function determineMarketPhase(data: RawMarketData): MarketPhaseResult {
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
  } = data

  const newLowsDominating = new_lows_count > new_highs_count * 2

  // Bear — most severe, check first
  if (
    !spy_above_50dma &&
    !spy_above_150dma &&
    !spy_above_200dma &&
    !spy_200dma_trending_up &&
    newLowsDominating
  ) {
    return {
      market_phase: 'bear',
      max_long_exposure_pct: 0,
      reasoning: `SPY is below all three moving averages with the 200-day MA trending down. New lows are dominating new highs (${new_lows_count} vs ${new_highs_count}). No long entries under any circumstances.`,
    }
  }

  // Correction
  if (
    distribution_days >= 5 ||
    (!spy_above_50dma && !spy_above_150dma) ||
    ftd_invalidated
  ) {
    const reasons: string[] = []
    if (distribution_days >= 5) reasons.push(`${distribution_days} distribution days in last 25 sessions`)
    if (!spy_above_50dma && !spy_above_150dma) reasons.push('SPY below 50-day and 150-day MA')
    if (ftd_invalidated) reasons.push('Follow-Through Day has been invalidated')
    return {
      market_phase: 'correction',
      max_long_exposure_pct: 0,
      reasoning: `Market is in correction: ${reasons.join('; ')}. Avoid new long entries.`,
    }
  }

  // Under pressure
  if (distribution_days >= 4 || !spy_above_50dma) {
    const reasons: string[] = []
    if (distribution_days >= 4) reasons.push(`${distribution_days} distribution days`)
    if (!spy_above_50dma) reasons.push('SPY below 50-day MA')
    return {
      market_phase: 'under_pressure',
      max_long_exposure_pct: 50,
      reasoning: `Market is under pressure: ${reasons.join('; ')}. Reduce size, no aggressive new entries.`,
    }
  }

  // Rally attempt — bouncing but no confirmed FTD yet
  if (!ftd_active || ftd_invalidated) {
    return {
      market_phase: 'rally_attempt',
      max_long_exposure_pct: 25,
      reasoning: `Market is attempting a rally but no confirmed Follow-Through Day is active. Wait for FTD confirmation before committing capital.`,
    }
  }

  // Confirmed uptrend — all conditions must pass
  if (
    ftd_active &&
    !ftd_invalidated &&
    distribution_days <= 3 &&
    spy_above_50dma &&
    spy_above_150dma &&
    spy_above_200dma &&
    new_highs_count >= new_lows_count
  ) {
    return {
      market_phase: 'confirmed_uptrend',
      max_long_exposure_pct: 100,
      reasoning: `Confirmed uptrend: FTD active and not invalidated, only ${distribution_days} distribution days, SPY above all three MAs, new highs (${new_highs_count}) leading new lows (${new_lows_count}).`,
    }
  }

  // Default fallback — meets some but not all uptrend conditions
  return {
    market_phase: 'under_pressure',
    max_long_exposure_pct: 50,
    reasoning: `Market conditions are mixed — FTD active but not all uptrend conditions met. Proceed cautiously with reduced size.`,
  }
}

async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    appConfig.supabaseUrl,
    appConfig.supabaseAnonKey,
    {
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
    }
  )
}

function isValidRawData(body: unknown): body is RawMarketData {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>

  return (
    typeof b.spy_price === 'number' && Number.isFinite(b.spy_price) && b.spy_price > 0 &&
    typeof b.spy_change_pct === 'number' && Number.isFinite(b.spy_change_pct) &&
    typeof b.spy_above_50dma === 'boolean' &&
    typeof b.spy_above_150dma === 'boolean' &&
    typeof b.spy_above_200dma === 'boolean' &&
    typeof b.spy_200dma_trending_up === 'boolean' &&
    typeof b.distribution_days === 'number' && Number.isInteger(b.distribution_days) && b.distribution_days >= 0 &&
    typeof b.ftd_active === 'boolean' &&
    typeof b.ftd_invalidated === 'boolean' &&
    typeof b.new_highs_count === 'number' && Number.isInteger(b.new_highs_count) && b.new_highs_count >= 0 &&
    typeof b.new_lows_count === 'number' && Number.isInteger(b.new_lows_count) && b.new_lows_count >= 0 &&
    typeof b.leading_sectors === 'string' && b.leading_sectors.trim().length > 0
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
  const { market_phase, max_long_exposure_pct, reasoning } = determineMarketPhase(body)

const fullPayload = {
    user_id: user.id,
    snapshot_date: today,
    market_phase,
    max_long_exposure_pct,
    // New columns
    spy_price: body.spy_price,
    spy_change_pct: body.spy_change_pct,
    spy_above_50dma: body.spy_above_50dma,
    spy_above_150dma: body.spy_above_150dma,
    spy_above_200dma: body.spy_above_200dma,
    spy_200dma_trending_up: body.spy_200dma_trending_up,
    distribution_days: body.distribution_days,
    leading_sectors: body.leading_sectors,
    reasoning,
    // Existing columns — mapped for backwards compatibility
    spx_distribution_days: body.distribution_days,
    indexes_above_50dma: body.spy_above_50dma,
    indexes_above_150dma: body.spy_above_150dma,
    indexes_above_200dma: body.spy_above_200dma,
    ftd_active: body.ftd_active,
    new_highs_count: body.new_highs_count,
    new_lows_count: body.new_lows_count,
    source: 'automation',
    last_market_scan_at: new Date().toISOString(),
  }


  const { error } = await supabase
    .from('market_snapshots')
    .upsert(fullPayload, { onConflict: 'snapshot_date' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    market_phase,
    max_long_exposure_pct,
    snapshot_date: today,
    reasoning,
  })
}