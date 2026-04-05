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
  screener_min_eps_growth_pct: number | null
  screener_min_revenue_growth_pct: number | null
  screener_min_price: number | null
  screener_min_avg_volume: number | null
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

type RemovalCandidate = {
  id: string
  ticker: string
  company_name: string | null
  setup_grade: string | null
  eps_growth_pct: number | null
  revenue_growth_pct: number | null
  price: number | null
  removal_reason: string
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
      .select(
        'user_id, notification_email, screener_min_eps_growth_pct, screener_min_revenue_growth_pct, screener_min_price, screener_min_avg_volume'
      )
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

    let flagged = 0
    const tickers: string[] = []
    const flaggedStocks: FlaggedStock[] = []
    let removalProposals = 0

    for (const stock of (stocksToFlag ?? []) as WatchlistRow[]) {
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

    const { data: removalCandidatesData, error: removalCandidatesError } = await supabase
      .from('watchlist')
      .select(
        'id, ticker, company_name, setup_grade, eps_growth_pct, revenue_growth_pct, price'
      )
      .eq('user_id', userId)
      .eq('source', 'automation')
      .eq('signal_state', 'candidate')

    if (removalCandidatesError) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load removal proposal candidates: ${removalCandidatesError.message}`,
      })

      return jsonResponse(
        { success: false, reason: 'Failed to load removal proposal candidates' },
        500
      )
    }

    const minEps = Number(settings.screener_min_eps_growth_pct ?? 25)
    const minRevenue = Number(settings.screener_min_revenue_growth_pct ?? 20)
    const minPrice = Number(settings.screener_min_price ?? 10)

    for (const candidate of (removalCandidatesData ?? []) as Omit<RemovalCandidate, 'removal_reason'>[]) {
      const reasons: string[] = []

      if (candidate.setup_grade === 'F') {
        reasons.push('Setup graded F by research')
      }
      if (
        candidate.eps_growth_pct !== null &&
        candidate.eps_growth_pct < minEps
      ) {
        reasons.push(
          `EPS growth ${candidate.eps_growth_pct}% is below minimum ${minEps}%`
        )
      }
      if (
        candidate.revenue_growth_pct !== null &&
        candidate.revenue_growth_pct < minRevenue
      ) {
        reasons.push(
          `Revenue growth ${candidate.revenue_growth_pct}% is below minimum ${minRevenue}%`
        )
      }
      if (
        candidate.price !== null &&
        candidate.price < minPrice
      ) {
        reasons.push(
          `Price $${candidate.price} is below minimum $${minPrice}`
        )
      }

      if (reasons.length === 0) continue

      const removalReason = reasons.join('. ')

      const existingRemovalAction = await getUnresolvedPendingAction({
        userId,
        ticker: candidate.ticker,
        actionType: 'watchlist_removal',
      })

      if (existingRemovalAction) continue

      const pendingActionResult = await createPendingAction({
        userId,
        ticker: candidate.ticker,
        actionType: 'watchlist_removal',
        urgency: 'low',
        title: `Remove candidate: ${candidate.ticker}`,
        message: removalReason,
        watchlistId: candidate.id,
        expiresAt: undefined,
        payloadJson: {
          removalReason,
          setupGrade: candidate.setup_grade,
          epsGrowthPct: candidate.eps_growth_pct,
          revenueGrowthPct: candidate.revenue_growth_pct,
          source: 'automation',
        },
      })

      if (!pendingActionResult.created) {
        console.error(
          `[watchlist-review] Failed to create removal proposal for ${candidate.ticker}: ${pendingActionResult.reason}`
        )
        continue
      }

      removalProposals += 1
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
      message: `Watchlist review complete. Flagged: ${flagged}. Removal proposals: ${removalProposals}`,
      changesJson: {
        flagged,
        removalProposals,
        tickers,
        windowKey,
      },
    })

    return jsonResponse(
      {
        success: true,
        flagged,
        removalProposals,
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