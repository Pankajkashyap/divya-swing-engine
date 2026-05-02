import { createBrowserClient } from '@supabase/ssr'

export function createInvestingBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_INVESTING_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_INVESTING_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_INVESTING_SUPABASE_URL or NEXT_PUBLIC_INVESTING_SUPABASE_ANON_KEY'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}