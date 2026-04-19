import { createBrowserClient } from '@supabase/ssr'
import { appConfig } from '@/app/trading/lib/config'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    appConfig.supabaseUrl,
    appConfig.supabaseAnonKey
  )
}