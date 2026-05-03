import { NextRequest, NextResponse } from 'next/server'
import { getBatchQuotes } from '@/app/investing/lib/fmp'

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker')?.trim().toUpperCase()
  if (!ticker) {
    return NextResponse.json({ error: 'Missing ticker' }, { status: 400 })
  }
  try {
    const quotes = await getBatchQuotes([ticker])
    const price = quotes?.[0]?.price ?? null
    return NextResponse.json({ ticker, price })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 })
  }
}
