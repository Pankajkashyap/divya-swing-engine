import 'server-only'

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred'

function getFredApiKey() {
  const apiKey = process.env.FRED_API_KEY

  if (!apiKey) {
    throw new Error('Missing FRED_API_KEY')
  }

  return apiKey
}

type FredFetchOptions = {
  path: string
  query?: Record<string, string | number | boolean | undefined | null>
}

function buildFredUrl({ path, query = {} }: FredFetchOptions) {
  const apiKey = getFredApiKey()
  const url = new URL(`${FRED_BASE_URL}/${path.replace(/^\/+/, '')}`)

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })

  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('file_type', 'json')

  return url.toString()
}

async function fredFetch<T>({ path, query }: FredFetchOptions): Promise<T> {
  const response = await fetch(buildFredUrl({ path, query }), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    next: { revalidate: 86400 },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`FRED request failed (${response.status} ${response.statusText}) for ${path}. ${body}`)
  }

  const data = (await response.json()) as T | { error_code?: number; error_message?: string }

  if (
    typeof data === 'object' &&
    data !== null &&
    'error_message' in data &&
    data.error_message
  ) {
    throw new Error(`FRED API error for ${path}: ${data.error_message}`)
  }

  return data as T
}

export type FredObservation = {
  realtime_start: string
  realtime_end: string
  date: string
  value: string
}

export type FredSeriesResponse = {
  realtime_start: string
  realtime_end: string
  observation_start: string
  observation_end: string
  units: string
  output_type: number
  file_type: string
  order_by: string
  sort_order: string
  count: number
  offset: number
  limit: number
  observations: FredObservation[]
}

export type FredLatestValue = {
  seriesId: string
  date: string | null
  value: number | null
  rawValue: string | null
}

export const FRED_SERIES = {
  GDP: 'GDP',
  CPIAUCSL: 'CPIAUCSL',
  PCEPILFE: 'PCEPILFE',
  UNRATE: 'UNRATE',
  FEDFUNDS: 'FEDFUNDS',
  DGS10: 'DGS10',
  DGS2: 'DGS2',
  T10Y2Y: 'T10Y2Y',
  VIXCLS: 'VIXCLS',
  ICSA: 'ICSA',
  UMCSENT: 'UMCSENT',
  HOUST: 'HOUST',
  SP500: 'SP500',
  RSAFS: 'RSAFS',
  PERMIT: 'PERMIT',
  TOTALSA: 'TOTALSA',
} as const

export type FredSeriesId = (typeof FRED_SERIES)[keyof typeof FRED_SERIES]

function parseFredValue(value: string): number | null {
  if (!value || value === '.') return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function getSeries(seriesId: string, limit = 1): Promise<FredLatestValue> {
  const data = await fredFetch<FredSeriesResponse>({
    path: 'series/observations',
    query: {
      series_id: seriesId,
      sort_order: 'desc',
      limit,
    },
  })

  const latest = data.observations[0]

  return {
    seriesId,
    date: latest?.date ?? null,
    value: latest ? parseFredValue(latest.value) : null,
    rawValue: latest?.value ?? null,
  }
}

export async function getMultipleSeries(seriesIds: string[]): Promise<FredLatestValue[]> {
  if (seriesIds.length === 0) return []
  const results = await Promise.allSettled(
    seriesIds.map((seriesId) => getSeries(seriesId, 1))
  )
  return results.map((result, i) =>
    result.status === 'fulfilled'
      ? result.value
      : { seriesId: seriesIds[i], date: null, value: null, rawValue: null }
  )
}

export type FredHistoryPoint = {
  date: string
  value: number | null
}

/**
 * Fetch historical observations for a FRED series within a date range.
 * Returns data points in chronological order (oldest first).
 * Useful for charting trends on the macro dashboard.
 *
 * @param seriesId - FRED series ID (e.g., 'CPIAUCSL')
 * @param observationStart - Start date in YYYY-MM-DD format
 * @param observationEnd - End date in YYYY-MM-DD format (defaults to today)
 */
export async function getSeriesHistory(
  seriesId: string,
  observationStart: string,
  observationEnd?: string
): Promise<FredHistoryPoint[]> {
  const data = await fredFetch<FredSeriesResponse>({
    path: 'series/observations',
    query: {
      series_id: seriesId,
      observation_start: observationStart,
      observation_end: observationEnd,
      sort_order: 'asc',
    },
  })

  return data.observations.map((obs) => ({
    date: obs.date,
    value: parseFredValue(obs.value),
  }))
}