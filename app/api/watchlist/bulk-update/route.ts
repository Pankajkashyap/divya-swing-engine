import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { appConfig } from '@/lib/config'

type CandidateRow = {
  id: string
  ticker: string
  eps_growth_pct?: number | null
  revenue_growth_pct?: number | null
  setup_grade?: 'A+' | 'A' | 'B' | 'C' | null
  trend_template_pass?: boolean | null
  rs_line_confirmed?: boolean | null
  base_pattern_valid?: boolean | null
  entry_near_pivot?: boolean | null
  volume_dry_up_pass?: boolean | null
  volume_breakout_confirmed?: boolean | null
  earnings_within_2_weeks?: boolean | null
  binary_event_risk?: boolean | null
  acc_dist_rating?: 'A' | 'B' | 'C' | 'D' | 'E' | null
  industry_group_rank?: number | null
  entry_zone_low?: number | null
  entry_zone_high?: number | null
  stop_price?: number | null
  target_1_price?: number | null
  target_2_price?: number | null
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
] as const

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumberOrNull(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isBooleanOrNull(value: unknown): boolean {
  return value === null || typeof value === 'boolean'
}

function validateRow(row: unknown): string | null {
  if (!isObject(row)) return 'Each row must be an object'
  if (typeof row.id !== 'string' || row.id.trim() === '') return 'Each row must include a non-empty id'
  if (typeof row.ticker !== 'string' || row.ticker.trim() === '') {
    return `Row ${row.id} must include a non-empty ticker`
  }

  for (const field of numericFields) {
    if (field in row && !isNumberOrNull(row[field])) {
      return `Field ${field} must be a number or null`
    }
  }

  for (const field of booleanFields) {
    if (field in row && !isBooleanOrNull(row[field])) {
      return `Field ${field} must be a boolean or null`
    }
  }

  if (
    'setup_grade' in row &&
    row.setup_grade !== null &&
    row.setup_grade !== undefined &&
    !['A+', 'A', 'B', 'C'].includes(String(row.setup_grade))
  ) {
    return 'setup_grade must be one of A+, A, B, C or null'
  }

  if (
    'acc_dist_rating' in row &&
    row.acc_dist_rating !== null &&
    row.acc_dist_rating !== undefined &&
    !['A', 'B', 'C', 'D', 'E'].includes(String(row.acc_dist_rating))
  ) {
    return 'acc_dist_rating must be one of A, B, C, D, E or null'
  }

  return null
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
        setAll() {},
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected an array of candidates' }, { status: 400 })
  }

  for (const row of body) {
    const validationError = validateRow(row)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
  }

  const candidateRows = body as CandidateRow[]
  const ids = candidateRows.map((row) => row.id)

  const { data: owned } = await supabase
    .from('watchlist')
    .select('id')
    .in('id', ids)
    .eq('user_id', user.id)

  const ownedIds = new Set(owned?.map((row) => row.id) ?? [])
  const safeRows = candidateRows.filter((row) => ownedIds.has(row.id))

  if (safeRows.length === 0) {
    return NextResponse.json({
      updated: 0,
      skipped: candidateRows.length,
      failed: 0,
      errors: [],
    })
  }

  const { data: current, error: currentError } = await supabase
    .from('watchlist')
    .select(
      'id, setup_grade, trend_template_pass, rs_line_confirmed, base_pattern_valid, entry_near_pivot, volume_dry_up_pass, volume_breakout_confirmed, earnings_within_2_weeks, binary_event_risk, acc_dist_rating, industry_group_rank, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price'
    )
    .in('id', Array.from(ownedIds))

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 })
  }

  const currentMap = new Map((current ?? []).map((row) => [row.id, row]))

  let updated = 0
  let skipped = candidateRows.length - safeRows.length
  let failed = 0
  const errors: Array<{ id: string; message: string }> = []

  for (const row of safeRows) {
    const existing = currentMap.get(row.id)

    if (!existing) {
      skipped += 1
      continue
    }

    const updatePayload: Record<string, unknown> = {}

    for (const field of updatableFields) {
      const incomingValue = row[field]
      const currentValue = existing[field]

      if (incomingValue !== undefined && incomingValue !== null && currentValue === null) {
        updatePayload[field] = incomingValue
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      skipped += 1
      continue
    }

    const { error } = await supabase
      .from('watchlist')
      .update(updatePayload)
      .eq('id', row.id)
      .eq('user_id', user.id)

    if (error) {
      failed += 1
      errors.push({ id: row.id, message: error.message })
    } else {
      updated += 1
    }
  }

  return NextResponse.json({
    updated,
    skipped,
    failed,
    errors,
  })
}