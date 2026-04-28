import { NextRequest, NextResponse } from 'next/server'
import { fmpFetch } from '@/app/investing/lib/fmp'

type FmpScreenerResult = {
  symbol: string
  companyName: string
  marketCap: number | null
  sector: string | null
  industry: string | null
  price: number | null
  beta: number | null
  volume: number | null
  exchange: string | null
  country: string | null
  isActivelyTrading: boolean | null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sector = searchParams.get('sector') || undefined
  const marketCapMin = searchParams.get('marketCapMin') || '2000000000'
  const marketCapMax = searchParams.get('marketCapMax') || undefined
  const limit = searchParams.get('limit') || '25'

  try {
    const results = await fmpFetch<FmpScreenerResult[]>('/stock-screener', {
      sector,
      marketCapMoreThan: marketCapMin,
      marketCapLowerThan: marketCapMax,
      exchange: 'NYSE,NASDAQ',
      country: 'US',
      isActivelyTrading: 'true',
      limit,
    })

    const cleaned = (Array.isArray(results) ? results : [])
      .filter((r) => r.symbol && r.companyName && r.price != null && r.price > 0)
      .map((r) => ({
        ticker: r.symbol,
        company: r.companyName,
        sector: r.sector || 'Unknown',
        industry: r.industry || null,
        marketCap: r.marketCap,
        price: r.price,
        exchange: r.exchange,
      }))

    return NextResponse.json({ data: cleaned })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stock screen failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}