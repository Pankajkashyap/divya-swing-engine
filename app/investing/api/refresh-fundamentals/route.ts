import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { evaluateTicker } from '@/app/investing/lib/engine/evaluateTicker'

export const maxDuration = 60

type HoldingTickerRow = {
  ticker: string
  bucket: string | null
}

type WatchlistTickerRow = {
  ticker: string
  status: string | null
}

type ExistingAnalysisRow = {
  id: string
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_INVESTING_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_INVESTING_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [holdingsRes, watchlistRes] = await Promise.all([
      supabase
        .from('investing_holdings')
        .select('ticker, bucket')
        .eq('user_id', user.id),
      supabase
        .from('investing_watchlist')
        .select('ticker, status')
        .eq('user_id', user.id),
    ])

    if (holdingsRes.error) {
      return NextResponse.json({ error: holdingsRes.error.message }, { status: 500 })
    }

    if (watchlistRes.error) {
      return NextResponse.json({ error: watchlistRes.error.message }, { status: 500 })
    }

    const holdingRows = (holdingsRes.data ?? []) as HoldingTickerRow[]
    const watchlistRows = (watchlistRes.data ?? []) as WatchlistTickerRow[]

    const holdingTickers = holdingRows
      .filter(
        (h) => h.bucket !== 'TFSA Cash' && h.bucket !== 'Non-registered Cash'
      )
      .map((h) => h.ticker.toUpperCase())

    const watchlistTickers = watchlistRows
      .filter((w) => w.status !== 'Removed')
      .map((w) => w.ticker.toUpperCase())

    const uniqueTickers = [...new Set([...holdingTickers, ...watchlistTickers])]

    if (uniqueTickers.length === 0) {
      return NextResponse.json({
        message: 'No tickers to refresh.',
        evaluated: 0,
        updated: 0,
        errors: [],
      })
    }

    let evaluated = 0
    let updated = 0
    const errors: string[] = []
    const results: Array<{ ticker: string; verdict: string; score: number | null }> = []

    for (const ticker of uniqueTickers) {
      try {
        const engineResult = await evaluateTicker(ticker)
        evaluated++

        const snapshot = engineResult.snapshot
        const scorecard = engineResult.scorecard
        const verdict = engineResult.verdict

        const valuationCat = scorecard?.categories?.find((c) => c.id === 'valuation')
        const qualityCat = scorecard?.categories?.find((c) => c.id === 'quality')
        const finHealthCat = scorecard?.categories?.find(
          (c) => c.id === 'financialHealth'
        )

        const autoConfidence =
          verdict?.label === 'Strong Buy' || verdict?.label === 'Buy'
            ? 'High'
            : verdict?.label === 'Hold'
              ? 'Medium'
              : 'Low'

        const { data: existingAnalyses, error: existingError } = await supabase
          .from('investing_stock_analyses')
          .select('id')
          .eq('user_id', user.id)
          .eq('ticker', ticker)
          .order('analysis_date', { ascending: false })
          .limit(1)

        if (existingError) {
          errors.push(`${ticker}: Lookup failed — ${existingError.message}`)
          continue
        }

        const existingRows = (existingAnalyses ?? []) as ExistingAnalysisRow[]

        const updatePayload = {
          roic_score_auto: qualityCat?.score ?? null,
          roic_score_explanation: qualityCat?.explanation ?? null,
          valuation_score_auto: valuationCat?.score ?? null,
          valuation_score_explanation: valuationCat?.explanation ?? null,
          fin_health_score_auto: finHealthCat?.score ?? null,
          fin_health_score_explanation: finHealthCat?.explanation ?? null,
          confidence_auto: autoConfidence,
          confidence_explanation: verdict?.explanation ?? null,
          verdict_auto: verdict?.label ?? null,
          verdict_explanation: verdict?.explanation ?? null,
          fair_value_low: snapshot.fairValueLow ?? null,
          fair_value_high: snapshot.fairValueHigh ?? null,
          updated_at: new Date().toISOString(),
        }

        if (existingRows.length > 0) {
          const { error: updateError } = await supabase
            .from('investing_stock_analyses')
            .update(updatePayload)
            .eq('id', existingRows[0].id)

          if (updateError) {
            errors.push(`${ticker}: Update failed — ${updateError.message}`)
          } else {
            updated++
          }
        }

        results.push({
          ticker,
          verdict: verdict?.label ?? 'Unknown',
          score: scorecard?.overallScore ?? null,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`${ticker}: ${msg}`)
      }
    }

    return NextResponse.json({
      message: 'Fundamental refresh complete.',
      totalTickers: uniqueTickers.length,
      evaluated,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      results,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Fundamental refresh failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}