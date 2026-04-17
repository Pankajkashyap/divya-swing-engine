import { NextResponse } from 'next/server'

type UniverseInputRow = {
  ticker: string
  company_name: string | null
  index_membership: string | null
}

function isValidTicker(value: string) {
  return value.length >= 1 && value.length <= 5 && !/\s/.test(value)
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }

    current += char
  }

  result.push(current)
  return result
}

export async function GET() {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv',
      { cache: 'no-store' }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch GitHub universe' },
        { status: 500 }
      )
    }

    const csv = await response.text()
    const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0)

    if (lines.length <= 1) {
      return NextResponse.json({
        tickers: [],
        count: 0,
        source: 'github',
        fetched_at: new Date().toISOString(),
      })
    }

    const tickers: UniverseInputRow[] = []

    for (const line of lines.slice(1)) {
      const columns = parseCsvLine(line)
      const symbol = (columns[0] ?? '').trim().toUpperCase()
      const security = (columns[1] ?? '').trim()

      if (!symbol || !isValidTicker(symbol)) continue

      tickers.push({
        ticker: symbol,
        company_name: security || null,
        index_membership: 'S&P 500',
      })
    }

    return NextResponse.json({
      tickers,
      count: tickers.length,
      source: 'github',
      fetched_at: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch GitHub universe' },
      { status: 500 }
    )
  }
}