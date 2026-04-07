// Server only — do not import in client components

import { createClient } from 'npm:@supabase/supabase-js@2'
import { validateCronSecret } from '../_shared/cronAuth.ts'
import {
  getCadenceWindowKey,
  getMarketWindow,
} from '../_shared/marketHours.ts'
import {
  startScanLog,
  finishScanLog,
  hasAlreadyProcessed,
} from '../_shared/scanLog.ts'
import { marketDataProvider } from '../_shared/marketDataProvider/index.ts'
import { edgeConfig } from '../_shared/config.ts'

const supabaseUrl = edgeConfig.supabaseUrl
const serviceRoleKey = edgeConfig.supabaseServiceRoleKey

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null

function jsonResponse(payload: unknown, statusCode: number): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status: statusCode,
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

function getTodayDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
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

    if (!supabase) {
      return jsonResponse(
        { success: false, reason: 'Supabase environment not configured' },
        500
      )
    }

    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('user_id, timezone')
      .limit(1)
      .maybeSingle()

    if (settingsError) {
      return jsonResponse(
        {
          success: false,
          reason: `Failed to load user settings: ${settingsError.message}`,
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

    const userId = userSettings.user_id
    const windowKey = getCadenceWindowKey('market-scan')

    const alreadyProcessed = await hasAlreadyProcessed({
      jobType: 'market-scan',
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
      jobType: 'market-scan',
      windowKey,
    })

    const marketIndex = await marketDataProvider.fetchMarketIndex()

    if (!marketIndex) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: 'Market index fetch returned null',
      })

      return jsonResponse(
        { success: false, reason: 'Provider returned null' },
        200
      )
    }

    const { data: latestSnapshot, error: latestSnapshotError } = await supabase
      .from('market_snapshots')
      .select('market_phase')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastPhase = latestSnapshotError
      ? null
      : latestSnapshot?.market_phase ?? null

    getMarketWindow()

    const snapshotDate = getTodayDateString()
    const scanTimestamp = new Date().toISOString()

    const { data: existingSnapshot } = await supabase
      .from('market_snapshots')
      .select('id, market_phase')
      .eq('snapshot_date', snapshotDate)
      .maybeSingle()

    let upsertError = null

    if (existingSnapshot) {
      const { error } = await supabase
        .from('market_snapshots')
        .update({
          last_market_scan_at: scanTimestamp,
          spy_price: marketIndex.spyPrice,
        })
        .eq('snapshot_date', snapshotDate)
      upsertError = error
    } else {
      const { error } = await supabase
        .from('market_snapshots')
        .insert({
          user_id: userId,
          snapshot_date: snapshotDate,
          market_phase: 'correction',
          max_long_exposure_pct: 0,
          source: 'automation',
          last_market_scan_at: scanTimestamp,
          spy_price: marketIndex.spyPrice,
        })
      upsertError = error
    }

    if (upsertError) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Snapshot upsert failed: ${upsertError.message}`,
      })

      return jsonResponse(
        { success: false, reason: 'DB write failed' },
        200
      )
    }

    const effectivePhase = existingSnapshot
      ? existingSnapshot.market_phase
      : 'correction'

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message: `Market scan completed. Phase: ${effectivePhase}`,
      changesJson: {
        previousPhase: lastPhase,
        newPhase: effectivePhase,
        phaseChanged: false,
        spyPrice: marketIndex.spyPrice,
        windowKey,
      },
    })

    return jsonResponse(
      {
        success: true,
        phaseChanged: false,
        previousPhase: lastPhase,
        newPhase: effectivePhase,
        spyPrice: marketIndex.spyPrice,
        windowKey,
      },
      200
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unexpected market scan error'

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