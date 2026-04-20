import { NextRequest, NextResponse } from 'next/server'
import { evaluateTicker } from '@/app/investing/lib/engine/evaluateTicker'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')?.trim()

  if (!ticker) {
    return NextResponse.json(
      { error: 'Missing ticker query parameter.' },
      { status: 400 }
    )
  }

  try {
    const result = await evaluateTicker(ticker)
    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error evaluating ticker.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}