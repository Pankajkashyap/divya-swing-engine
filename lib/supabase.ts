import { createBrowserClient } from '@supabase/ssr'
import { appConfig } from '@/lib/config'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    appConfig.supabaseUrl,
    appConfig.supabaseAnonKey
  )
}

export const supabase = createSupabaseBrowserClient()