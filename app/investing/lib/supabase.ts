import { createBrowserClient } from '@supabase/ssr'
import { appConfig } from '@/lib/config'

export function createInvestingSupabaseBrowserClient() {
  return createBrowserClient(
    appConfig.supabaseUrl,
    appConfig.supabaseAnonKey
  )
}