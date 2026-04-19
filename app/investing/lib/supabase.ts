import { createBrowserClient } from '@supabase/ssr'

function getInvestingEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_INVESTING_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_INVESTING_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_INVESTING_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_INVESTING_SUPABASE_ANON_KEY')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  }
}

export function createInvestingSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getInvestingEnv()
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey)

  const originalFrom = client.from.bind(client)

  client.from = ((table: string) => {
    console.log('[INVESTING CLIENT] from(', table, ') host =', supabaseUrl)
    return originalFrom(table)
  }) as typeof client.from

  return client
}