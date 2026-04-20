import { NextRequest, NextResponse } from 'next/server'
import { evaluateTicker } from '@/app/investing/lib/engine/evaluateTicker'
import { fmpFetch } from '@/app/investing/lib/fmp'

type FmpProfile = Record<string, unknown>
type FmpKeyMetricsTtm = Record<string, unknown>
type FmpRatiosTtm = Record<string, unknown>
type FmpIncomeStatement = Record<string, unknown>
type FmpBalanceSheet = Record<string, unknown>
type FmpCashFlowStatement = Record<string, unknown>

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')?.trim().toUpperCase()

  if (!ticker) {
    return NextResponse.json(
      { error: 'Missing ticker query parameter.' },
      { status: 400 }
    )
  }

  try {
    const [
      profileData,
      keyMetricsTtmData,
      ratiosTtmData,
      incomeStatements,
      balanceSheets,
      cashFlows,
      result,
    ] = await Promise.all([
      fmpFetch<FmpProfile[]>('/profile', { symbol: ticker }),
      fmpFetch<FmpKeyMetricsTtm[]>('/key-metrics-ttm', { symbol: ticker }),
      fmpFetch<FmpRatiosTtm[]>('/ratios-ttm', { symbol: ticker }),
      fmpFetch<FmpIncomeStatement[]>('/income-statement', { symbol: ticker, limit: 5 }),
      fmpFetch<FmpBalanceSheet[]>('/balance-sheet-statement', { symbol: ticker, limit: 5 }),
      fmpFetch<FmpCashFlowStatement[]>('/cash-flow-statement', { symbol: ticker, limit: 5 }),
      evaluateTicker(ticker),
    ])

    return NextResponse.json({
      ticker,
      raw: {
        profileData,
        keyMetricsTtmData,
        ratiosTtmData,
        incomeStatements,
        balanceSheets,
        cashFlows,
      },
      result,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error evaluating ticker.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}