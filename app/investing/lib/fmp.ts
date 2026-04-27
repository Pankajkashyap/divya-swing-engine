const FMP_BASE_URL = 'https://financialmodelingprep.com/stable'

function getFmpApiKey() {
  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || process.env.FMP_API_KEY

  if (!apiKey) {
    throw new Error('Missing FMP API key')
  }

  return apiKey
}

export async function fmpFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const apiKey = getFmpApiKey()
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    searchParams.set(key, String(value))
  }

  searchParams.set('apikey', apiKey)

  const response = await fetch(`${FMP_BASE_URL}${path}?${searchParams.toString()}`, {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`FMP request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

export type FmpQuote = {
  symbol: string
  price: number
  name?: string
  changesPercentage?: number
  change?: number
  dayLow?: number
  dayHigh?: number
  yearHigh?: number
  yearLow?: number
  marketCap?: number
  volume?: number
  avgVolume?: number
  exchange?: string
  open?: number
  previousClose?: number
}

/**
 * Fetch real-time quotes for multiple tickers in a single API call.
 * FMP supports comma-separated tickers: /quote/AAPL,MSFT,GOOGL
 * Free tier: counts as 1 API call regardless of ticker count.
 */
export async function getBatchQuotes(tickers: string[]): Promise<FmpQuote[]> {
  if (tickers.length === 0) return []

  const chunkSize = 50
  const chunks: string[][] = []
  for (let i = 0; i < tickers.length; i += chunkSize) {
    chunks.push(tickers.slice(i, i + chunkSize))
  }

  const allQuotes: FmpQuote[] = []
  for (const chunk of chunks) {
    const joined = chunk.join(',')
    const quotes = await fmpFetch<FmpQuote[]>(`/quote/${joined}`)
    if (Array.isArray(quotes)) {
      allQuotes.push(...quotes)
    }
  }

  return allQuotes
}