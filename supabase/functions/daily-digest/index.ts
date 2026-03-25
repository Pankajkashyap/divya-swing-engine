// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateCronSecret } from '../_shared/cronAuth.ts'
import { getCadenceWindowKey } from '../_shared/marketHours.ts'
import {
  startScanLog,
  finishScanLog,
  hasAlreadyProcessed,
} from '../_shared/scanLog.ts'
import { sendEmail } from '../_shared/email/resend.ts'
import {
  dailyDigest,
  type DailyDigestData,
} from '../_shared/email/templates/dailyDigest.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

type UserSettingsRow = {
  user_id: string
  notification_email: string | null
  digest_email_enabled: boolean | null
}

type MarketSnapshotRow = {
  market_phase: string | null
}

type OpenTradeRow = {
  ticker: string
  entry_price_actual: number | null
  stop_price_current: number | null
  target_1_price: number | null
  trade_state: string | null
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
      .select('user_id, notification_email, digest_email_enabled')
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

    const settings = userSettings as UserSettingsRow
    const userId = settings.user_id

    if (settings.digest_email_enabled === false) {
      return jsonResponse(
        { skipped: true, reason: 'Digest email disabled in settings' },
        200
      )
    }

    const recipientEmail =
      settings.notification_email ??
      Deno.env.get('AUTHORIZED_USER_EMAIL') ??
      null

    if (!recipientEmail) {
      console.warn('[daily-digest] No recipient email configured.')
      return jsonResponse(
        { skipped: true, reason: 'No recipient email configured' },
        200
      )
    }

    const windowKey = getCadenceWindowKey('daily-digest')

    const alreadyProcessed = await hasAlreadyProcessed({
      jobType: 'daily-digest',
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
      jobType: 'daily-digest',
      windowKey,
    })

    const today = new Date().toISOString().slice(0, 10)
    const todayStart = `${today}T00:00:00.000Z`

    const [
      marketSnapshotResult,
      openTradesResult,
      signalsCountResult,
      flaggedCountResult,
      unresolvedCountResult,
    ] = await Promise.all([
      supabase
        .from('market_snapshots')
        .select('market_phase')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('trades')
        .select('ticker, entry_price_actual, stop_price_current, target_1_price, trade_state')
        .eq('user_id', userId)
        .in('status', ['open', 'partial'])
        .order('entry_date', { ascending: false }),
      supabase
        .from('pending_actions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action_type', 'buy_signal')
        .gte('created_at', todayStart),
      supabase
        .from('watchlist')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('flagged_for_review', true)
        .neq('signal_state', 'archived'),
      supabase
        .from('pending_actions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('state', 'awaiting_confirmation'),
    ])

    if (marketSnapshotResult.error) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load market snapshot: ${marketSnapshotResult.error.message}`,
      })
      return jsonResponse(
        { success: false, reason: 'Failed to load market snapshot' },
        500
      )
    }

    if (openTradesResult.error) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load open trades: ${openTradesResult.error.message}`,
      })
      return jsonResponse(
        { success: false, reason: 'Failed to load open trades' },
        500
      )
    }

    if (signalsCountResult.error) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load signals count: ${signalsCountResult.error.message}`,
      })
      return jsonResponse(
        { success: false, reason: 'Failed to load signals count' },
        500
      )
    }

    if (flaggedCountResult.error) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load flagged watchlist count: ${flaggedCountResult.error.message}`,
      })
      return jsonResponse(
        { success: false, reason: 'Failed to load flagged watchlist count' },
        500
      )
    }

    if (unresolvedCountResult.error) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load unresolved actions count: ${unresolvedCountResult.error.message}`,
      })
      return jsonResponse(
        { success: false, reason: 'Failed to load unresolved actions count' },
        500
      )
    }

    const marketSnapshot = marketSnapshotResult.data as MarketSnapshotRow | null
    const openTrades = (openTradesResult.data ?? []) as OpenTradeRow[]
    const signalsFiredCount = Number(signalsCountResult.count ?? 0)
    const flaggedWatchlistCount = Number(flaggedCountResult.count ?? 0)
    const unresolvedActionsCount = Number(unresolvedCountResult.count ?? 0)

    const digestData: DailyDigestData = {
      date: today,
      marketPhase: marketSnapshot?.market_phase ?? 'unknown',
      openTradesCount: openTrades.length,
      signalsFiredCount,
      flaggedWatchlistCount,
      unresolvedActionsCount,
      openTrades: openTrades.map((t) => ({
        ticker: t.ticker,
        entryPrice: t.entry_price_actual ?? 0,
        currentStop: t.stop_price_current ?? 0,
        target1: t.target_1_price ?? 0,
      })),
      appUrl: Deno.env.get('APP_BASE_URL') ?? '',
    }

    const { subject, html } = dailyDigest(digestData)

    const emailResult = await sendEmail(
      { to: recipientEmail, subject, html },
      {
        apiKey: Deno.env.get('RESEND_API_KEY') ?? '',
        fromEmail: Deno.env.get('RESEND_FROM_EMAIL') ?? '',
      }
    )

    if (!emailResult.sent) {
      console.error(`[daily-digest] Email send failed: ${emailResult.reason}`)
    }

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message: `Daily digest sent. Open trades: ${openTrades.length}. Signals today: ${signalsFiredCount}. Unresolved actions: ${unresolvedActionsCount}.`,
      changesJson: {
        emailSent: emailResult.sent,
        openTradesCount: openTrades.length,
        signalsFiredCount,
        flaggedWatchlistCount,
        unresolvedActionsCount,
        windowKey,
      },
    })

    return jsonResponse(
      {
        success: true,
        emailSent: emailResult.sent,
        openTradesCount: openTrades.length,
        signalsFiredCount,
        flaggedWatchlistCount,
        unresolvedActionsCount,
        windowKey,
      },
      200
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unexpected daily-digest error'

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