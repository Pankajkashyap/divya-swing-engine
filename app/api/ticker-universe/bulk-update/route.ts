import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { appConfig } from '@/lib/config'

type UniverseInputRow = {
  ticker: string
  company_name?: string | null
  index_membership?: string | null
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

function normalizeTicker(value: string) {
  return value.trim().toUpperCase()
}

function buildInFilter(values: string[]) {
  return `(${values.map((ticker) => `"${ticker.replace(/"/g, '\\"')}"`).join(',')})`
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json(
      { upserted: 0, deactivated: 0, errors: ['Unauthorized'] },
      { status: 401 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { upserted: 0, deactivated: 0, errors: ['Invalid JSON body'] },
      { status: 400 }
    )
  }

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json(
      { upserted: 0, deactivated: 0, errors: ['Body must be a non-empty array'] },
      { status: 400 }
    )
  }

  const errors: string[] = []
  const validRows: UniverseInputRow[] = []

  for (const [index, item] of body.entries()) {
    if (typeof item !== 'object' || item === null) {
      errors.push(`Row ${index + 1}: item must be an object`)
      continue
    }

    const row = item as Record<string, unknown>
    const rawTicker = typeof row.ticker === 'string' ? normalizeTicker(row.ticker) : ''

    if (!rawTicker) {
      errors.push(`Row ${index + 1}: ticker is required`)
      continue
    }

    const companyName =
      typeof row.company_name === 'string' ? row.company_name.trim() || null : null

    const indexMembership =
      typeof row.index_membership === 'string' ? row.index_membership.trim() || null : null

    validRows.push({
      ticker: rawTicker,
      company_name: companyName,
      index_membership: indexMembership,
    })
  }

  if (validRows.length === 0) {
    return NextResponse.json(
      { upserted: 0, deactivated: 0, errors: errors.length ? errors : ['No valid rows found'] },
      { status: 400 }
    )
  }

  const dedupedMap = new Map<string, UniverseInputRow>()
  for (const row of validRows) {
    dedupedMap.set(row.ticker, row)
  }

  const dedupedRows = [...dedupedMap.values()]
  const incomingTickers = dedupedRows.map((row) => row.ticker)
  const nowIso = new Date().toISOString()

  const upsertPayload = dedupedRows.map((row) => ({
    ticker: row.ticker,
    company_name: row.company_name ?? null,
    index_membership: row.index_membership ?? null,
    is_active: true,
    updated_at: nowIso,
  }))

  const { error: upsertError } = await supabase
    .from('ticker_universe')
    .upsert(upsertPayload, { onConflict: 'ticker' })

  if (upsertError) {
    return NextResponse.json(
      { upserted: 0, deactivated: 0, errors: [...errors, upsertError.message] },
      { status: 500 }
    )
  }

  let deactivated = 0

  const DEACTIVATION_THRESHOLD = 400

  if (incomingTickers.length > DEACTIVATION_THRESHOLD) {
    const { data: toDeactivate, error: previewError } = await supabase
      .from('ticker_universe')
      .select('ticker')
      .eq('is_active', true)
      .not('ticker', 'in', buildInFilter(incomingTickers))

    if (previewError) {
      return NextResponse.json(
        { upserted: dedupedRows.length, deactivated: 0, errors: [...errors, previewError.message] },
        { status: 500 }
      )
    }

    deactivated = toDeactivate?.length ?? 0

    if (deactivated > 0) {
      const { error: deactivateError } = await supabase
        .from('ticker_universe')
        .update({ is_active: false, updated_at: nowIso })
        .not('ticker', 'in', buildInFilter(incomingTickers))

      if (deactivateError) {
        return NextResponse.json(
          {
            upserted: dedupedRows.length,
            deactivated: 0,
            errors: [...errors, deactivateError.message],
          },
          { status: 500 }
        )
      }
    }
  }

  return NextResponse.json({
    upserted: dedupedRows.length,
    deactivated,
    errors,
  })
}