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