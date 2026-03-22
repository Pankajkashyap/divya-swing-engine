// Server only — do not import in client components

import { timingSafeEqual } from 'node:crypto'

export type CronAuthResult =
  | { authorised: true }
  | { authorised: false; reason: string }

export function validateCronSecret(request: Request): CronAuthResult {
  try {
    const configuredSecret = process.env.CRON_SECRET

    if (!configuredSecret) {
      return { authorised: false, reason: 'CRON_SECRET not configured' }
    }

    const authorizationHeader = request.headers.get('Authorization')

    if (!authorizationHeader) {
      return { authorised: false, reason: 'Missing authorization header' }
    }

    const expectedValue = `Bearer ${configuredSecret}`

    const providedBuffer = Buffer.from(authorizationHeader)
    const expectedBuffer = Buffer.from(expectedValue)

    if (providedBuffer.length !== expectedBuffer.length) {
      return { authorised: false, reason: 'Invalid cron secret' }
    }

    const isMatch = timingSafeEqual(providedBuffer, expectedBuffer)

    if (!isMatch) {
      return { authorised: false, reason: 'Invalid cron secret' }
    }

    return { authorised: true }
  } catch {
    return { authorised: false, reason: 'Invalid cron secret' }
  }
}