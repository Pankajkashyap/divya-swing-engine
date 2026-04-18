import { createBrowserClient } from '@supabase/ssr'

function getShaynaInvestingEnv() {
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

export function createShaynaInvestingSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getShaynaInvestingEnv()

  if (typeof window !== 'undefined') {
    console.log('SHAYNA_CLIENT_URL', supabaseUrl)
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}