// Server/client safe app config for Next.js

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing env var: ${name}`)
  }
  return value
}

export const appConfig = {
  supabaseUrl: requireEnv(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),
  supabaseAnonKey: requireEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  appUrl: requireEnv(
    'NEXT_PUBLIC_APP_URL',
    process.env.NEXT_PUBLIC_APP_URL
  ),
}