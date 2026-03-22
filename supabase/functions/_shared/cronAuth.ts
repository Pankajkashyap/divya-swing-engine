// Server only — do not import in client components

export type CronAuthResult =
  | { authorised: true }
  | { authorised: false; reason: string }

async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)

  if (aBytes.length !== bBytes.length) {
    return false
  }

  const aHashBuffer = await crypto.subtle.digest('SHA-256', aBytes)
  const bHashBuffer = await crypto.subtle.digest('SHA-256', bBytes)

  const aHash = new Uint8Array(aHashBuffer)
  const bHash = new Uint8Array(bHashBuffer)

  let diff = 0
  for (let i = 0; i < aHash.length; i += 1) {
    diff |= aHash[i] ^ bHash[i]
  }

  return diff === 0
}

export async function validateCronSecret(
  request: Request
): Promise<CronAuthResult> {
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
    const isMatch = await constantTimeEqual(authorizationHeader, expectedValue)

    if (!isMatch) {
      return { authorised: false, reason: 'Invalid cron secret' }
    }

    return { authorised: true }
  } catch {
    return { authorised: false, reason: 'Invalid cron secret' }
  }
}