import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBatchQuotes } from '@/app/investing/lib/fmp'

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
        .select('id, ticker, shares, avg_cost, bucket')
        .eq('user_id', user.id),
      supabase
        .from('investing_watchlist')
        .select('id, ticker, target_entry')
        .eq('user_id', user.id),
    ])

    if (holdingsRes.error) {
      return NextResponse.json({ error: holdingsRes.error.message }, { status: 500 })
    }

    if (watchlistRes.error) {
      return NextResponse.json({ error: watchlistRes.error.message }, { status: 500 })
    }

    const holdings = holdingsRes.data ?? []
    const watchlistItems = watchlistRes.data ?? []

    const holdingTickers = holdings
      .filter((h) => h.bucket !== 'TFSA Cash' && h.bucket !== 'Non-registered Cash')
      .map((h) => h.ticker.toUpperCase())

    const watchlistTickers = watchlistItems.map((w) => w.ticker.toUpperCase())
    const uniqueTickers = [...new Set([...holdingTickers, ...watchlistTickers])]

    if (uniqueTickers.length === 0) {
      return NextResponse.json({
        message: 'No tickers to refresh.',
        holdingsUpdated: 0,
        watchlistUpdated: 0,
      })
    }

    const quotes = await getBatchQuotes(uniqueTickers)
    const priceMap = new Map<string, number>()

    for (const quote of quotes) {
      if (quote.symbol && quote.price != null) {
        priceMap.set(quote.symbol.toUpperCase(), quote.price)
      }
    }

    let holdingsUpdated = 0
    const holdingErrors: string[] = []

    for (const holding of holdings) {
      if (holding.bucket === 'TFSA Cash' || holding.bucket === 'Non-registered Cash') {
        continue
      }

      const price = priceMap.get(holding.ticker.toUpperCase())
      if (price == null) continue

      const marketValue = holding.shares * price
      const gainLossPct =
        holding.avg_cost > 0 ? ((price - holding.avg_cost) / holding.avg_cost) * 100 : null

      const { error: updateError } = await supabase
        .from('investing_holdings')
        .update({
          current_price: Math.round(price * 100) / 100,
          market_value: Math.round(marketValue * 100) / 100,
          gain_loss_pct: gainLossPct != null ? Math.round(gainLossPct * 100) / 100 : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', holding.id)

      if (updateError) {
        holdingErrors.push(`${holding.ticker}: ${updateError.message}`)
      } else {
        holdingsUpdated++
      }
    }

    let watchlistUpdated = 0
    const watchlistErrors: string[] = []

    for (const item of watchlistItems) {
      const price = priceMap.get(item.ticker.toUpperCase())
      if (price == null) continue

      const discountToEntry =
        item.target_entry != null && item.target_entry > 0
          ? ((item.target_entry - price) / item.target_entry) * 100
          : null

      const { error: updateError } = await supabase
        .from('investing_watchlist')
        .update({
          current_price: Math.round(price * 100) / 100,
          discount_to_entry:
            discountToEntry != null ? Math.round(discountToEntry * 100) / 100 : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      if (updateError) {
        watchlistErrors.push(`${item.ticker}: ${updateError.message}`)
      } else {
        watchlistUpdated++
      }
    }

    const errors = [...holdingErrors, ...watchlistErrors]

    return NextResponse.json({
      message: 'Prices refreshed successfully.',
      holdingsUpdated,
      watchlistUpdated,
      tickersFetched: uniqueTickers.length,
      quotesReceived: quotes.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh prices.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}