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
  weeklyDigest,
  type WeeklyDigestData,
} from '../_shared/email/templates/weeklyDigest.ts'

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

type ClosedTradeRow = {
  ticker: string
  pnl_dollar: number | null
  pnl_pct: number | null
  entry_date: string | null
  exit_date: string | null
}

type WatchlistHealthRow = {
  flagged_for_review: boolean | null
  signal_state: string | null
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
      console.warn('[weekly-digest] No recipient email configured.')
      return jsonResponse(
        { skipped: true, reason: 'No recipient email configured' },
        200
      )
    }

    const windowKey = getCadenceWindowKey('weekly-digest')

    const alreadyProcessed = await hasAlreadyProcessed({
      jobType: 'weekly-digest',
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
      jobType: 'weekly-digest',
      windowKey,
    })

    const now = new Date()
    const weekEnding = now.toISOString().slice(0, 10)
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    const weekStartStr = weekStart.toISOString().slice(0, 10)

    const [
      marketSnapshotResult,
      closedTradesResult,
      openTradesCountResult,
      watchlistHealthResult,
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
        .select('ticker, pnl_dollar, pnl_pct, entry_date, exit_date')
        .eq('user_id', userId)
        .eq('status', 'closed')
        .gte('exit_date', weekStartStr)
        .lte('exit_date', weekEnding)
        .order('exit_date', { ascending: false }),
      supabase
        .from('trades')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['open', 'partial']),
      supabase
        .from('watchlist')
        .select('flagged_for_review, signal_state')
        .eq('user_id', userId),
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

    if (closedTradesResult.error) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load closed trades: ${closedTradesResult.error.message}`,
      })
      return jsonResponse(
        { success: false, reason: 'Failed to load closed trades' },
        500
      )
    }

    if (openTradesCountResult.error) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load open trades count: ${openTradesCountResult.error.message}`,
      })
      return jsonResponse(
        { success: false, reason: 'Failed to load open trades count' },
        500
      )
    }

    if (watchlistHealthResult.error) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load watchlist health: ${watchlistHealthResult.error.message}`,
      })
      return jsonResponse(
        { success: false, reason: 'Failed to load watchlist health' },
        500
      )
    }

    const marketSnapshot = marketSnapshotResult.data as MarketSnapshotRow | null
    const closedTrades = (closedTradesResult.data ?? []) as ClosedTradeRow[]
    const openTradesCount = Number(openTradesCountResult.count ?? 0)
    const watchlistRows = (watchlistHealthResult.data ?? []) as WatchlistHealthRow[]

    const wins = closedTrades.filter((t) => (t.pnl_dollar ?? 0) > 0)
    const losses = closedTrades.filter((t) => (t.pnl_dollar ?? 0) < 0)

    const totalRealizedPnl = closedTrades.reduce(
      (sum, t) => sum + (t.pnl_dollar ?? 0),
      0
    )

    const avgWin =
      wins.length > 0
        ? wins.reduce((sum, t) => sum + (t.pnl_dollar ?? 0), 0) / wins.length
        : 0

    const avgLoss =
      losses.length > 0
        ? losses.reduce((sum, t) => sum + (t.pnl_dollar ?? 0), 0) / losses.length
        : 0

    const activeWatchlist = watchlistRows.filter(
      (row) => row.signal_state !== 'archived'
    )
    const flaggedWatchlist = activeWatchlist.filter(
      (row) => row.flagged_for_review === true
    )

    const digestData: WeeklyDigestData = {
      weekEnding,
      marketPhase: marketSnapshot?.market_phase ?? 'unknown',
      openTradesCount,
      closedTradesCount: closedTrades.length,
      winsCount: wins.length,
      lossesCount: losses.length,
      totalRealizedPnl: Number(totalRealizedPnl.toFixed(2)),
      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLoss.toFixed(2)),
      watchlistCount: activeWatchlist.length,
      flaggedCount: flaggedWatchlist.length,
      appUrl: Deno.env.get('APP_BASE_URL') ?? '',
    }

    const { subject, html } = weeklyDigest(digestData)

    const emailResult = await sendEmail(
      { to: recipientEmail, subject, html },
      {
        apiKey: Deno.env.get('RESEND_API_KEY') ?? '',
        fromEmail: Deno.env.get('RESEND_FROM_EMAIL') ?? '',
      }
    )

    if (!emailResult.sent) {
      console.error(`[weekly-digest] Email send failed: ${emailResult.reason}`)
    }

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message: `Weekly digest sent. Closed trades: ${closedTrades.length}. Wins: ${wins.length}. Losses: ${losses.length}. P&L: $${Number(totalRealizedPnl.toFixed(2))}.`,
      changesJson: {
        emailSent: emailResult.sent,
        weekEnding,
        closedTradesCount: closedTrades.length,
        winsCount: wins.length,
        lossesCount: losses.length,
        totalRealizedPnl: Number(totalRealizedPnl.toFixed(2)),
        openTradesCount,
        watchlistCount: activeWatchlist.length,
        flaggedCount: flaggedWatchlist.length,
        windowKey,
      },
    })

    return jsonResponse(
      {
        success: true,
        emailSent: emailResult.sent,
        weekEnding,
        closedTradesCount: closedTrades.length,
        winsCount: wins.length,
        lossesCount: losses.length,
        totalRealizedPnl: Number(totalRealizedPnl.toFixed(2)),
        openTradesCount,
        windowKey,
      },
      200
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unexpected weekly-digest error'

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