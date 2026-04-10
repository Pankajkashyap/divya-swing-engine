import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { appConfig } from '@/lib/config'

type CandidateRow = {
  id: string
  ticker: string
  eps_growth_pct: number | null
  revenue_growth_pct: number | null
  setup_grade: 'A+' | 'A' | 'B' | 'C' | 'F' | null
  trend_template_pass: boolean | null
  rs_line_confirmed: boolean | null
  base_pattern_valid: boolean | null
  entry_near_pivot: boolean | null
  volume_dry_up_pass: boolean | null
  volume_breakout_confirmed: boolean | null
  earnings_within_2_weeks: boolean | null
  binary_event_risk: boolean | null
  acc_dist_rating: 'A' | 'B' | 'C' | 'D' | 'E' | null
  industry_group_rank: number | null
  entry_zone_low: number | null
  entry_zone_high: number | null
  stop_price: number | null
  target_1_price: number | null
  target_2_price: number | null
  watchlist_group: 'active_setup' | 'near_pivot' | 'developing' | null
  ibd_group: string | null
  ibd_group_zone: 1 | 2 | 3 | 4 | null
  rs_line_state: 'leading' | 'confirmed' | 'warning' | null
  catalyst_type:
    | 'earnings_acceleration'
    | 'revenue_acceleration'
    | 'new_product_service'
    | 'management_change'
    | 'regulatory_approval'
    | 'spinoff_restructuring'
    | 'sector_rotation'
    | 'macro_theme'
    | 'none_identified'
    | null
  institutional_trend: 'accumulating' | 'neutral' | 'distributing' | null
  insider_buying: boolean | null
  short_interest_trend: 'increasing' | 'stable' | 'decreasing' | null
  base_count: number | null
  likely_failure_type:
    | 'institutional_reversal'
    | 'fade'
    | 'gap_down'
    | 'limbo'
    | 'sector_rotation'
    | null
  failure_response: string | null
}

type CurrentWatchlistRow = {
  id: string
  setup_grade: 'A+' | 'A' | 'B' | 'C' | 'F' | null
  trend_template_pass: boolean | null
  rs_line_confirmed: boolean | null
  base_pattern_valid: boolean | null
  entry_near_pivot: boolean | null
  volume_dry_up_pass: boolean | null
  volume_breakout_confirmed: boolean | null
  earnings_within_2_weeks: boolean | null
  binary_event_risk: boolean | null
  acc_dist_rating: 'A' | 'B' | 'C' | 'D' | 'E' | null
  industry_group_rank: number | null
  entry_zone_low: number | null
  entry_zone_high: number | null
  stop_price: number | null
  target_1_price: number | null
  target_2_price: number | null
  watchlist_group: 'active_setup' | 'near_pivot' | 'developing' | null
  ibd_group: string | null
  ibd_group_zone: 1 | 2 | 3 | 4 | null
  rs_line_state: 'leading' | 'confirmed' | 'warning' | null
  catalyst_type:
    | 'earnings_acceleration'
    | 'revenue_acceleration'
    | 'new_product_service'
    | 'management_change'
    | 'regulatory_approval'
    | 'spinoff_restructuring'
    | 'sector_rotation'
    | 'macro_theme'
    | 'none_identified'
    | null
  institutional_trend: 'accumulating' | 'neutral' | 'distributing' | null
  insider_buying: boolean | null
  short_interest_trend: 'increasing' | 'stable' | 'decreasing' | null
  base_count: number | null
  likely_failure_type:
    | 'institutional_reversal'
    | 'fade'
    | 'gap_down'
    | 'limbo'
    | 'sector_rotation'
    | null
  failure_response: string | null
}

const numericFields = [
  'entry_zone_low',
  'entry_zone_high',
  'stop_price',
  'target_1_price',
  'target_2_price',
  'eps_growth_pct',
  'revenue_growth_pct',
  'industry_group_rank',
] as const

const booleanFields = [
  'trend_template_pass',
  'rs_line_confirmed',
  'base_pattern_valid',
  'entry_near_pivot',
  'volume_dry_up_pass',
  'volume_breakout_confirmed',
  'earnings_within_2_weeks',
  'binary_event_risk',
] as const

const updatableFields = [
  'setup_grade',
  'trend_template_pass',
  'rs_line_confirmed',
  'base_pattern_valid',
  'entry_near_pivot',
  'volume_dry_up_pass',
  'volume_breakout_confirmed',
  'earnings_within_2_weeks',
  'binary_event_risk',
  'acc_dist_rating',
  'industry_group_rank',
  'entry_zone_low',
  'entry_zone_high',
  'stop_price',
  'target_1_price',
  'target_2_price',
  'watchlist_group',
  'ibd_group',
  'ibd_group_zone',
  'rs_line_state',
  'catalyst_type',
  'institutional_trend',
  'insider_buying',
  'short_interest_trend',
  'base_count',
  'likely_failure_type',
  'failure_response',
] as const

function isNumberOrNull(value: unknown): boolean {
  return value === null || typeof value === 'number'
}

function isBooleanOrNull(value: unknown): boolean {
  return value === null || typeof value === 'boolean'
}

function isValidSetupGrade(value: unknown): boolean {
  return value === null || ['A+', 'A', 'B', 'C', 'F'].includes(String(value))
}

function isValidAccDist(value: unknown): boolean {
  return value === null || ['A', 'B', 'C', 'D', 'E'].includes(String(value))
}

function isValidWatchlistGroup(value: unknown): boolean {
  return value === null || ['active_setup', 'near_pivot', 'developing'].includes(String(value))
}

function isValidIbdGroupZone(value: unknown): boolean {
  return value === null || [1, 2, 3, 4].includes(value as number)
}

function isValidRsLineState(value: unknown): boolean {
  return value === null || ['leading', 'confirmed', 'warning'].includes(String(value))
}

function isValidCatalystType(value: unknown): boolean {
  return value === null || [
    'earnings_acceleration', 'revenue_acceleration', 'new_product_service',
    'management_change', 'regulatory_approval', 'spinoff_restructuring',
    'sector_rotation', 'macro_theme', 'none_identified'
  ].includes(String(value))
}

function isValidInstitutionalTrend(value: unknown): boolean {
  return value === null || ['accumulating', 'neutral', 'distributing'].includes(String(value))
}

function isValidShortInterestTrend(value: unknown): boolean {
  return value === null || ['increasing', 'stable', 'decreasing'].includes(String(value))
}

function isValidLikelyFailureType(value: unknown): boolean {
  return value === null || [
    'institutional_reversal', 'fade', 'gap_down', 'limbo', 'sector_rotation'
  ].includes(String(value))
}

function validateRow(row: unknown): row is CandidateRow {
  if (typeof row !== 'object' || row === null) return false

  const candidate = row as Record<string, unknown>

  if (typeof candidate.id !== 'string' || !candidate.id.trim()) return false
  if (typeof candidate.ticker !== 'string' || !candidate.ticker.trim()) return false
  if (!isValidSetupGrade(candidate.setup_grade)) return false
  if (!isValidAccDist(candidate.acc_dist_rating)) return false
  if (!isValidWatchlistGroup(candidate.watchlist_group)) return false
  if (!isValidIbdGroupZone(candidate.ibd_group_zone)) return false
  if (!isValidRsLineState(candidate.rs_line_state)) return false
  if (!isValidCatalystType(candidate.catalyst_type)) return false
  if (!isValidInstitutionalTrend(candidate.institutional_trend)) return false
  if (candidate.insider_buying !== null && typeof candidate.insider_buying !== 'boolean') return false
  if (!isValidShortInterestTrend(candidate.short_interest_trend)) return false
  if (candidate.base_count !== null && (typeof candidate.base_count !== 'number' || candidate.base_count < 1 || candidate.base_count > 4)) return false
  if (!isValidLikelyFailureType(candidate.likely_failure_type)) return false
  if (candidate.failure_response !== null && typeof candidate.failure_response !== 'string') return false
  if (candidate.ibd_group !== null && typeof candidate.ibd_group !== 'string') return false

  for (const field of numericFields) {
    if (!isNumberOrNull(candidate[field])) return false
  }

  for (const field of booleanFields) {
    if (!isBooleanOrNull(candidate[field])) return false
  }

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

  const body = await request.json()

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected an array of candidates' }, { status: 400 })
  }

  const allRows = body as unknown[]

  if (!allRows.every(validateRow)) {
    return NextResponse.json({ error: 'Invalid candidate payload' }, { status: 400 })
  }

  const rows = allRows as CandidateRow[]
  const ids = rows.map((row) => row.id)

  const { data: owned } = await supabase
    .from('watchlist')
    .select('id')
    .in('id', ids)
    .eq('user_id', user.id)

  const ownedIds = new Set((owned ?? []).map((row: { id: string }) => row.id))
  const safeRows = rows.filter((row) => ownedIds.has(row.id))

  const validRows = safeRows.filter((row) => row.setup_grade !== 'F')
  const rejectedRows = safeRows.filter((row) => row.setup_grade === 'F')

  console.log(`[bulk-update] rejected F-grade rows: ${rejectedRows.length}`)

  if (rejectedRows.length > 0) {
    const rejectedIds = rejectedRows.map((row) => row.id)
    await supabase
      .from('watchlist')
      .delete()
      .in('id', rejectedIds)
      .eq('user_id', user.id)
      .eq('source', 'automation')
  }

  const validIds = validRows.map((row) => row.id)

  const { data: current } = await supabase
    .from('watchlist')
    .select(`
      id,
      setup_grade,
      trend_template_pass,
      rs_line_confirmed,
      base_pattern_valid,
      entry_near_pivot,
      volume_dry_up_pass,
      volume_breakout_confirmed,
      earnings_within_2_weeks,
      binary_event_risk,
      acc_dist_rating,
      industry_group_rank,
      entry_zone_low,
      entry_zone_high,
      stop_price,
      target_1_price,
      target_2_price,
      watchlist_group,
      ibd_group,
      ibd_group_zone,
      rs_line_state,
      catalyst_type,
      institutional_trend,
      insider_buying,
      short_interest_trend,
      base_count,
      likely_failure_type,
      failure_response
    `)
    .in('id', validIds)

  const currentMap = new Map(
    ((current ?? []) as CurrentWatchlistRow[]).map((row) => [row.id, row])
  )

  let successCount = 0
  let skipCount = 0
  let failCount = 0
  const errorDetails: Array<{ id?: string; ticker?: string; message: string }> = []

  for (const row of validRows) {
    const existing = currentMap.get(row.id)

    if (!existing) {
      failCount += 1
      errorDetails.push({ id: row.id, ticker: row.ticker, message: 'Row not found' })
      continue
    }

    const updatePayload: Record<string, unknown> = {}
    for (const field of updatableFields) {
      const incomingValue = row[field]
      const currentValue = existing[field]

      if (incomingValue !== null && currentValue === null) {
        updatePayload[field] = incomingValue
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      skipCount += 1
      continue
    }

    const { error } = await supabase
      .from('watchlist')
      .update(updatePayload)
      .eq('id', row.id)
      .eq('user_id', user.id)

    if (error) {
      failCount += 1
      errorDetails.push({ id: row.id, ticker: row.ticker, message: error.message })
      continue
    }

    successCount += 1
  }

  return NextResponse.json({
    updated: successCount,
    rejected: rejectedRows.length,
    skipped: skipCount,
    failed: failCount,
    errors: errorDetails,
  })
}