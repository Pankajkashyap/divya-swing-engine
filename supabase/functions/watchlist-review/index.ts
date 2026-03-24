// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateCronSecret } from '../_shared/cronAuth.ts'
import { getCadenceWindowKey } from '../_shared/marketHours.ts'
import {
  startScanLog,
  finishScanLog,
  hasAlreadyProcessed,
} from '../_shared/scanLog.ts'
import {
  createPendingAction,
  getUnresolvedPendingAction,
} from '../_shared/pendingActions.ts'
import { sendEmail } from '../_shared/email/resend.ts'
import { watchlistReviewDigest } from '../_shared/email/templates/watchlistReviewDigest.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

type UserSettingsRow = {
  user_id: string
  notification_email: string | null
}

type WatchlistRow = {
  id: string
  ticker: string
  consecutive_fail_count: number | null
  flagged_for_review: boolean | null
  signal_state: string | null
  last_hard_fail_reason: string | null
}

type FlaggedStock = {
  ticker: string
  consecutiveFailCount: number
  lastHardFailReason: string | null
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
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
      .select('user_id, notification_email')
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
    const recipientEmail = settings.notification_email ?? null
    const windowKey = getCadenceWindowKey('watchlist-review')

    const alreadyProcessed = await hasAlreadyProcessed({
      jobType: 'watchlist-review',
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
      jobType: 'watchlist-review',
      windowKey,
    })

    const { data: stocksToFlag, error: watchlistError } = await supabase
      .from('watchlist')
      .select(`
        id,
        ticker,
        consecutive_fail_count,
        flagged_for_review,
        signal_state,
        last_hard_fail_reason
      `)
      .eq('user_id', userId)
      .gte('consecutive_fail_count', 3)
      .eq('flagged_for_review', false)
      .not('signal_state', 'in', '("archived","flagged_for_review")')

    if (watchlistError) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load watchlist review candidates: ${watchlistError.message}`,
      })

      return jsonResponse(
        { success: false, reason: 'Failed to load watchlist review candidates' },
        500
      )
    }

    if (!stocksToFlag || stocksToFlag.length === 0) {
      await safeFinishScanLog({
        logId,
        status: 'completed',
        message: 'No stocks to flag',
        changesJson: {
          flagged: 0,
          tickers: [],
          windowKey,
        },
      })

      return jsonResponse(
        {
          success: true,
          flagged: 0,
          windowKey,
        },
        200
      )
    }

    let flagged = 0
    const tickers: string[] = []
    const flaggedStocks: FlaggedStock[] = []

    for (const stock of stocksToFlag as WatchlistRow[]) {
      try {
        const failCount = Number(stock.consecutive_fail_count ?? 0)

        const { error: updateError } = await supabase
          .from('watchlist')
          .update({
            flagged_for_review: true,
            signal_state: 'flagged_for_review',
          })
          .eq('id', stock.id)

        if (updateError) {
          console.error(
            `[watchlist-review] Failed to flag ${stock.ticker}: ${updateError.message}`
          )
          continue
        }

        const existingAction = await getUnresolvedPendingAction({
          userId,
          ticker: stock.ticker,
          actionType: 'watchlist_review',
        })

        if (!existingAction) {
          const pendingActionResult = await createPendingAction({
            userId,
            ticker: stock.ticker,
            actionType: 'watchlist_review',
            urgency: 'low',
            title: `Review: ${stock.ticker} has failed ${failCount} consecutive scans`,
            message: `Last hard fail reason: ${stock.last_hard_fail_reason ?? 'unknown'}`,
            watchlistId: stock.id,
            expiresAt: undefined,
            payloadJson: {
              consecutiveFailCount: failCount,
              lastHardFailReason: stock.last_hard_fail_reason,
              signalState: stock.signal_state,
            },
          })

          if (!pendingActionResult.created) {
            console.error(
              `[watchlist-review] Failed to create pending action for ${stock.ticker}: ${pendingActionResult.reason}`
            )
          }
        }

        flagged += 1
        tickers.push(stock.ticker)
        flaggedStocks.push({
          ticker: stock.ticker,
          consecutiveFailCount: failCount,
          lastHardFailReason: stock.last_hard_fail_reason,
        })
      } catch (error) {
        console.error(
          `[watchlist-review] Processing failed for ${stock.ticker}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }

    if (flaggedStocks.length > 0 && recipientEmail) {
      try {
        const { subject, html } = watchlistReviewDigest({
          flaggedStocks,
          reviewDate: todayIso(),
          appUrl: Deno.env.get('APP_BASE_URL') ?? '',
        })

        const emailResult = await sendEmail(
          {
            to: recipientEmail,
            subject,
            html,
          },
          {
            apiKey: Deno.env.get('RESEND_API_KEY') ?? '',
            fromEmail: Deno.env.get('RESEND_FROM_EMAIL') ?? '',
          }
        )

        if (!emailResult.sent) {
          console.error(
            `[watchlist-review] Digest email failed: ${emailResult.reason}`
          )
        }
      } catch (error) {
        console.error(
          `[watchlist-review] Digest email failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message: `Watchlist review complete. Flagged: ${flagged}`,
      changesJson: {
        flagged,
        tickers,
        windowKey,
      },
    })

    return jsonResponse(
      {
        success: true,
        flagged,
        windowKey,
      },
      200
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unexpected watchlist-review error'

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