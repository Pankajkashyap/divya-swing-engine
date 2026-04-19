import { createBrowserClient } from '@supabase/ssr'
import { appConfig } from '@/app/trading/lib/config'

export function createSupabaseBrowserClient() {
  const client = createBrowserClient(
    appConfig.supabaseUrl,
    appConfig.supabaseAnonKey
  )

  const originalFrom = client.from.bind(client)

  client.from = ((table: string) => {
    console.log('[TRADING CLIENT] from(', table, ') host =', appConfig.supabaseUrl)
    return originalFrom(table)
  }) as typeof client.from

  return client
}

export const supabase = createSupabaseBrowserClient()