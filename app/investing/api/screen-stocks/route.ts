import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { StockUniverseItem } from '@/app/investing/types'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    })

    const { searchParams } = new URL(request.url)
    const sector = searchParams.get('sector') || null
    const marketCapTier = searchParams.get('marketCapTier') || null
    const search = searchParams.get('search')?.trim() || null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    let query = supabase
      .from('investing_stock_universe')
      .select('*')
      .eq('is_active', true)
      .order('company', { ascending: true })
      .limit(limit)

    if (sector) {
      query = query.eq('sector', sector)
    }

    if (marketCapTier) {
      query = query.eq('market_cap_tier', marketCapTier)
    }

    if (search) {
      query = query.or(`ticker.ilike.%${search}%,company.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const items = (data ?? []) as StockUniverseItem[]

    return NextResponse.json({
      data: items.map((item) => ({
        ticker: item.ticker,
        company: item.company,
        sector: item.sector,
        industry: item.industry,
        marketCapTier: item.market_cap_tier,
        exchange: item.exchange,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}