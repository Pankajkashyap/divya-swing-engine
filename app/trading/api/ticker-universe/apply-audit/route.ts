import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { appConfig } from '@/app/trading/lib/config'

type UniverseInputRow = {
  ticker: string
  company_name?: string | null
  index_membership?: string | null
}

type AuditDiff = {
  remove?: string[]
  add?: UniverseInputRow[]
  ticker_changes?: Array<{
    old: string
    new: string
    company_name: string | null
  }>
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

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json(
      {
        removed: 0,
        added: 0,
        ticker_changes_applied: 0,
        errors: ['Unauthorized'],
      },
      { status: 401 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        removed: 0,
        added: 0,
        ticker_changes_applied: 0,
        errors: ['Invalid JSON body'],
      },
      { status: 400 }
    )
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      {
        removed: 0,
        added: 0,
        ticker_changes_applied: 0,
        errors: ['Body must be an object'],
      },
      { status: 400 }
    )
  }

  const payload = body as AuditDiff
  const errors: string[] = []
  const nowIso = new Date().toISOString()

  let removed = 0
  let added = 0
  let tickerChangesApplied = 0

  const removeTickers = Array.isArray(payload.remove)
    ? payload.remove
        .filter((ticker): ticker is string => typeof ticker === 'string' && ticker.trim().length > 0)
        .map(normalizeTicker)
    : []

  const addRows = Array.isArray(payload.add)
    ? payload.add.filter(
        (row): row is UniverseInputRow =>
          typeof row === 'object' &&
          row !== null &&
          typeof row.ticker === 'string' &&
          row.ticker.trim().length > 0
      )
    : []

  const tickerChanges = Array.isArray(payload.ticker_changes)
    ? payload.ticker_changes.filter(
        (
          row
        ): row is {
          old: string
          new: string
          company_name: string | null
        } =>
          typeof row === 'object' &&
          row !== null &&
          typeof row.old === 'string' &&
          row.old.trim().length > 0 &&
          typeof row.new === 'string' &&
          row.new.trim().length > 0
      )
    : []

  for (const ticker of removeTickers) {
    const normalizedTicker = normalizeTicker(ticker)

    const { data, error } = await supabase
      .from('ticker_universe')
      .update({ is_active: false, updated_at: nowIso })
      .eq('ticker', normalizedTicker)
      .eq('is_active', true)
      .select('ticker')

    if (error) {
      errors.push(`Failed to remove ${normalizedTicker}: ${error.message}`)
      continue
    }

    removed += data?.length ?? 0
  }

  if (addRows.length > 0) {
    const upsertPayload = addRows.map((row) => ({
      ticker: normalizeTicker(row.ticker),
      company_name:
        typeof row.company_name === 'string' ? row.company_name.trim() || null : null,
      index_membership:
        typeof row.index_membership === 'string'
          ? row.index_membership.trim() || null
          : null,
      is_active: true,
      updated_at: nowIso,
    }))

    const { error } = await supabase
      .from('ticker_universe')
      .upsert(upsertPayload, { onConflict: 'ticker' })

    if (error) {
      errors.push(`Failed to add tickers: ${error.message}`)
    } else {
      added += upsertPayload.length
    }
  }

  for (const change of tickerChanges) {
    const oldTicker = normalizeTicker(change.old)
    const newTicker = normalizeTicker(change.new)

    const { error: deactivateError } = await supabase
      .from('ticker_universe')
      .update({ is_active: false, updated_at: nowIso })
      .eq('ticker', oldTicker)

    if (deactivateError) {
      errors.push(`Failed to deactivate ${oldTicker}: ${deactivateError.message}`)
      continue
    }

    const { error: upsertError } = await supabase
      .from('ticker_universe')
      .upsert(
        {
          ticker: newTicker,
          company_name:
            typeof change.company_name === 'string' ? change.company_name.trim() || null : null,
          index_membership: 'S&P 500',
          is_active: true,
          updated_at: nowIso,
        },
        { onConflict: 'ticker' }
      )

    if (upsertError) {
      errors.push(`Failed to apply ticker change ${oldTicker} -> ${newTicker}: ${upsertError.message}`)
      continue
    }

    tickerChangesApplied += 1
  }

  return NextResponse.json({
    removed,
    added,
    ticker_changes_applied: tickerChangesApplied,
    errors,
  })
}