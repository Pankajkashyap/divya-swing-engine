import { createBrowserClient } from '@supabase/ssr'

const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrlEnv) {
  throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKeyEnv) {
  throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const supabaseUrl: string = supabaseUrlEnv
const supabaseAnonKey: string = supabaseAnonKeyEnv

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createSupabaseBrowserClient()