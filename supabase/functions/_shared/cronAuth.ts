// Server only — do not import in client components

export type CronAuthResult =
  | { authorised: true }
  | { authorised: false; reason: string }

function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)

  if (aBytes.length !== bBytes.length) {
    return false
  }

  let diff = 0
  for (let i = 0; i < aBytes.length; i += 1) {
    diff |= aBytes[i] ^ bBytes[i]
  }

  return diff === 0
}

export function validateCronSecret(request: Request): CronAuthResult {
  try {
    const configuredSecret = Deno.env.get('CRON_SECRET')

    if (!configuredSecret) {
      return { authorised: false, reason: 'CRON_SECRET not configured' }
    }

    const authorizationHeader = request.headers.get('Authorization')

    if (!authorizationHeader) {
      return { authorised: false, reason: 'Missing authorization header' }
    }

    const expectedValue = `Bearer ${configuredSecret}`

    if (!constantTimeEqual(authorizationHeader, expectedValue)) {
      return { authorised: false, reason: 'Invalid cron secret' }
    }

    return { authorised: true }
  } catch {
    return { authorised: false, reason: 'Invalid cron secret' }
  }
}