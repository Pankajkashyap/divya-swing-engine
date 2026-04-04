import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { appConfig } from '@/lib/config'

type MarketPhase =
  | 'confirmed_uptrend'
  | 'under_pressure'
  | 'rally_attempt'
  | 'correction'
  | 'bear'

type MarketSnapshotPayload = {
  market_phase: MarketPhase
  max_long_exposure_pct: number
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

const validPhases: MarketPhase[] = [
  'confirmed_uptrend',
  'under_pressure',
  'rally_attempt',
  'correction',
  'bear',
]

const validExposures = [0, 25, 50, 100]

function isValidMarketSnapshotPayload(
  row: unknown
): row is MarketSnapshotPayload {
  if (typeof row !== 'object' || row === null) return false

  const r = row as Record<string, unknown>

  if (!validPhases.includes(r.market_phase as MarketPhase)) return false
  if (!validExposures.includes(r.max_long_exposure_pct as number)) return false
  if (typeof r.spy_price !== 'number' || r.spy_price <= 0) return false
  if (typeof r.spy_change_pct !== 'number') return false
  if (typeof r.spy_above_50dma !== 'boolean') return false
  if (typeof r.spy_above_150dma !== 'boolean') return false
  if (typeof r.spy_above_200dma !== 'boolean') return false
  if (
    typeof r.distribution_days !== 'number' ||
    r.distribution_days < 0 ||
    !Number.isInteger(r.distribution_days)
  ) {
    return false
  }
  if (typeof r.ftd_active !== 'boolean') return false
  if (typeof r.leading_sectors !== 'string' || !r.leading_sectors.trim()) {
    return false
  }
  if (typeof r.reasoning !== 'string' || !r.reasoning.trim()) return false

  return true
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    appConfig.supabaseUrl,
    appConfig.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = (await request.json()) as unknown

  if (!isValidMarketSnapshotPayload(body)) {
    return NextResponse.json(
      { error: 'Invalid market snapshot payload' },
      { status: 400 }
    )
  }

  const snapshotDate = new Date().toISOString().slice(0, 10)
  const payload = body as MarketSnapshotPayload

  const { error } = await supabase.from('market_snapshots').upsert(
    {
      user_id: user.id,
      snapshot_date: snapshotDate,
      market_phase: payload.market_phase,
      max_long_exposure_pct: payload.max_long_exposure_pct,
      spy_price: payload.spy_price,
      spy_change_pct: payload.spy_change_pct,
      spy_above_50dma: payload.spy_above_50dma,
      spy_above_150dma: payload.spy_above_150dma,
      spy_above_200dma: payload.spy_above_200dma,
      distribution_days: payload.distribution_days,
      ftd_active: payload.ftd_active,
      leading_sectors: payload.leading_sectors.trim(),
      reasoning: payload.reasoning.trim(),
      source: 'automation',
      last_market_scan_at: new Date().toISOString(),
    },
    { onConflict: 'snapshot_date' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    market_phase: payload.market_phase,
    max_long_exposure_pct: payload.max_long_exposure_pct,
    snapshot_date: snapshotDate,
  })
}