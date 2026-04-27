import { NextResponse } from 'next/server'
import { FRED_SERIES, getMultipleSeries } from '@/app/investing/lib/fred'

export async function GET() {
  try {
    const data = await getMultipleSeries([
      FRED_SERIES.FEDFUNDS,
      FRED_SERIES.DGS10,
      FRED_SERIES.DGS2,
      FRED_SERIES.T10Y2Y,
      FRED_SERIES.VIXCLS,
      FRED_SERIES.UNRATE,
      FRED_SERIES.CPIAUCSL,
      FRED_SERIES.SP500,
    ])

    return NextResponse.json(
      {
        data,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch macro data.'

    return NextResponse.json(
      {
        data: [],
        updatedAt: null,
        error: message,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    )
  }
}