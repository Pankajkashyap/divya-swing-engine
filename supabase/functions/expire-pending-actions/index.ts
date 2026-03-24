// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateCronSecret } from '../_shared/cronAuth.ts'
import { getCadenceWindowKey } from '../_shared/marketHours.ts'
import {
  startScanLog,
  finishScanLog,
  hasAlreadyProcessed,
} from '../_shared/scanLog.ts'
import { expireStaleActions } from '../_shared/pendingActions.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

type UserSettingsRow = {
  user_id: string
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function safeFinishScanLog(params: {
  logId: string | null
  status: 'started' | 'completed' | 'skipped' | 'failed'
  message?: string
  changesJson?: Record<string, unknown>
}): Promise<void> {
  if (!params.logId) return

  await finishScanLog({
    logId: params.logId,
    status: params.status,
    message: params.message,
    changesJson: params.changesJson,
  })
}

Deno.serve(async (request: Request) => {
  let logId: string | null = null

  try {
    const authResult = validateCronSecret(request)

    if (!authResult.authorised) {
      return jsonResponse(
        { success: false, reason: authResult.reason },
        401
      )
    }

    const { data: userSettings, error: userSettingsError } = await supabase
      .from('user_settings')
      .select('user_id')
      .limit(1)
      .maybeSingle()

    if (userSettingsError) {
      return jsonResponse(
        {
          success: false,
          reason: `Failed to load user settings: ${userSettingsError.message}`,
        },
        500
      )
    }

    if (!userSettings?.user_id) {
      return jsonResponse(
        { success: false, reason: 'No user settings found' },
        500
      )
    }

    const userId = (userSettings as UserSettingsRow).user_id
    const windowKey = getCadenceWindowKey('expire-pending-actions')

    const alreadyProcessed = await hasAlreadyProcessed({
      jobType: 'expire-pending-actions',
      windowKey,
    })

    if (alreadyProcessed) {
      return jsonResponse(
        { skipped: true, reason: 'Already processed this window' },
        200
      )
    }

    logId = await startScanLog({
      userId,
      jobType: 'expire-pending-actions',
      windowKey,
    })

    const expired = await expireStaleActions()

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message: `Expired stale pending actions: ${expired}`,
      changesJson: {
        expired,
        windowKey,
      },
    })

    return jsonResponse(
      {
        success: true,
        expired,
        windowKey,
      },
      200
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unexpected expire-pending-actions error'

    await safeFinishScanLog({
      logId,
      status: 'failed',
      message: errorMessage,
    })

    return jsonResponse(
      { success: false, reason: errorMessage },
      500
    )
  }
})