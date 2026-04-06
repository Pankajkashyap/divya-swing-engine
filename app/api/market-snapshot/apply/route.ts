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

type RequestBody = {
    snapshot_date: string
  market_phase: MarketPhase
  max_long_exposure_pct: 0 | 25 | 50 | 100
  spy_price: number
  spy_change_pct: number
  spy_above_50dma: boolean
  spy_above_150dma: boolean
  spy_above_200dma: boolean
  distribution_days: number
  ftd_active: boolean
  leading_sectors: string
  reasoning: string
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

function isValidPayload(body: unknown): body is RequestBody {
  if (typeof body !== 'object' || body === null) return false

  const b = body as Record<string, unknown>

  const validMarketPhases: MarketPhase[] = [
    'confirmed_uptrend',
    'under_pressure',
    'rally_attempt',
    'correction',
    'bear',
  ]

  const validExposureValues = [0, 25, 50, 100]

  return (
    typeof b.snapshot_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(b.snapshot_date as string) &&
    typeof b.market_phase === 'string' &&
    validMarketPhases.includes(b.market_phase as MarketPhase) &&
    typeof b.max_long_exposure_pct === 'number' &&
    validExposureValues.includes(b.max_long_exposure_pct) &&
    typeof b.spy_price === 'number' &&
    Number.isFinite(b.spy_price) &&
    b.spy_price > 0 &&
    typeof b.spy_change_pct === 'number' &&
    Number.isFinite(b.spy_change_pct) &&
    typeof b.spy_above_50dma === 'boolean' &&
    typeof b.spy_above_150dma === 'boolean' &&
    typeof b.spy_above_200dma === 'boolean' &&
    typeof b.distribution_days === 'number' &&
    Number.isInteger(b.distribution_days) &&
    b.distribution_days >= 0 &&
    typeof b.ftd_active === 'boolean' &&
    typeof b.leading_sectors === 'string' &&
    b.leading_sectors.trim().length > 0 &&
    typeof b.reasoning === 'string' &&
    b.reasoning.trim().length > 0
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

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const today = body.snapshot_date

  const fullPayload = {
    user_id: user.id,
    snapshot_date: today,
    market_phase: body.market_phase,
    max_long_exposure_pct: body.max_long_exposure_pct,
    spy_price: body.spy_price,
    spy_change_pct: body.spy_change_pct,
    spy_above_50dma: body.spy_above_50dma,
    spy_above_150dma: body.spy_above_150dma,
    spy_above_200dma: body.spy_above_200dma,
    distribution_days: body.distribution_days,
    ftd_active: body.ftd_active,
    leading_sectors: body.leading_sectors,
    reasoning: body.reasoning,
  }

const { error } = await supabase
  .from('market_snapshots')
  .upsert(fullPayload, { onConflict: 'snapshot_date' })

  if (error) {
    const minimalPayload = {
      user_id: user.id,
      snapshot_date: today,
      market_phase: body.market_phase,
      max_long_exposure_pct: body.max_long_exposure_pct,
    }

    const fallbackResult = await supabase
      .from('market_snapshots')
      .upsert(minimalPayload, { onConflict: 'snapshot_date' })

    if (fallbackResult.error) {
      return NextResponse.json(
        { error: fallbackResult.error.message },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    success: true,
    market_phase: body.market_phase,
    max_long_exposure_pct: body.max_long_exposure_pct,
    snapshot_date: today,
  })
}