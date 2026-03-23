// Server only — do not import in client components

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing env var: ${name}`)
  }
  return value
}

export const edgeConfig = {
  supabaseUrl: requireEnv('SUPABASE_URL', Deno.env.get('SUPABASE_URL')),
  supabaseServiceRoleKey: requireEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  ),
  cronSecret: Deno.env.get('CRON_SECRET') ?? '',
  resendApiKey: Deno.env.get('RESEND_API_KEY') ?? '',
  resendFromEmail: Deno.env.get('RESEND_FROM_EMAIL') ?? '',
  authorizedUserEmail: Deno.env.get('AUTHORIZED_USER_EMAIL') ?? '',
  appBaseUrl: Deno.env.get('APP_BASE_URL') ?? '',
}