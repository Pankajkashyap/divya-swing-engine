// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateCronSecret } from '../_shared/cronAuth.ts'
import { getCadenceWindowKey, getMarketWindow } from '../_shared/marketHours.ts'
import {
  startScanLog,
  finishScanLog,
  hasAlreadyProcessed,
} from '../_shared/scanLog.ts'
import { marketDataProvider } from '../_shared/marketDataProvider/index.ts'
import {
  createPendingAction,
  getUnresolvedPendingAction,
} from '../_shared/pendingActions.ts'
import { checkDedupe, recordNotification } from '../_shared/dedupe.ts'
import { sendEmail } from '../_shared/email/resend.ts'
import { stopAlert } from '../_shared/email/templates/stopAlert.ts'
import { targetAlert } from '../_shared/email/templates/targetAlert.ts'
import { edgeConfig } from '../_shared/config.ts'

const supabase = createClient(
  edgeConfig.supabaseUrl,
  edgeConfig.supabaseServiceRoleKey
)

type UserSettingsRow = {
  user_id: string
  notification_email: string | null
  urgent_alerts_enabled: boolean | null
  morning_trade_monitor_enabled: boolean | null
}

type TradeRow = {
  id: string
  ticker: string
  side: string | null
  status: 'open' | 'partial' | 'closed' | null
  trade_state: 'open' | 'partial' | 'closed' | null
  entry_price_actual: number | null
  shares_entered: number | null
  shares_exited: number | null
  stop_price_current: number | null
  target_1_price: number | null
  target_2_price: number | null
  last_monitored_at: string | null
  last_stop_alert_at: string | null
  last_target_1_alert_at: string | null
  last_target_2_alert_at: string | null
}

type TradeSummary = {
  ticker: string
  currentPrice: number | null
  stopAlertFired: boolean
  target1AlertFired: boolean
  target2AlertFired: boolean
  emailSent: boolean | null
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

function sharesHeldForTrade(trade: TradeRow): number {
  const entered = Number(trade.shares_entered ?? 0)
  const exited = Number(trade.shares_exited ?? 0)
  return Math.max(entered - exited, 0)
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
    .select('user_id, notification_email, urgent_alerts_enabled, morning_trade_monitor_enabled')
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

    const morningMonitorEnabled = settings.morning_trade_monitor_enabled ?? true
    const marketWindow = getMarketWindow()

      if (!morningMonitorEnabled && marketWindow === 'pre_market') {
      return jsonResponse(
      { skipped: true, reason: 'Morning trade monitor disabled in settings' },
      200
      )
      }

    const recipientEmail =
      settings.notification_email ?? edgeConfig.authorizedUserEmail ?? null

    if (!recipientEmail) {
      console.warn(
        '[trade-monitor] No recipient email configured. Emails will be skipped.'
      )
    }

    const windowKey = getCadenceWindowKey('trade-monitor')

    const alreadyProcessed = await hasAlreadyProcessed({
      jobType: 'trade-monitor',
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
      jobType: 'trade-monitor',
      windowKey,
    })

    const { data: openTrades, error: openTradesError } = await supabase
      .from('trades')
      .select(`
        id,
        ticker,
        side,
        status,
        trade_state,
        entry_price_actual,
        shares_entered,
        shares_exited,
        stop_price_current,
        target_1_price,
        target_2_price,
        last_monitored_at,
        last_stop_alert_at,
        last_target_1_alert_at,
        last_target_2_alert_at
      `)
      .in('status', ['open', 'partial'])
      .in('trade_state', ['open', 'partial'])
      .order('last_monitored_at', { ascending: true, nullsFirst: true })
      .limit(5)

    if (openTradesError) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load open trades: ${openTradesError.message}`,
      })

      return jsonResponse(
        { success: false, reason: 'Failed to load open trades' },
        500
      )
    }

    if (!openTrades || openTrades.length === 0) {
      await safeFinishScanLog({
        logId,
        status: 'completed',
        message: 'No open trades to monitor',
        changesJson: {
          monitored: 0,
          stopAlertsFired: 0,
          target1AlertsFired: 0,
          target2AlertsFired: 0,
          windowKey,
          tradeSummaries: [],
        },
      })

      return jsonResponse(
        {
          success: true,
          monitored: 0,
          stopAlertsFired: 0,
          target1AlertsFired: 0,
          target2AlertsFired: 0,
          windowKey,
        },
        200
      )
    }

    let monitored = 0
    let stopAlertsFired = 0
    let target1AlertsFired = 0
    let target2AlertsFired = 0

    const tradeSummaries: TradeSummary[] = []

    for (const trade of openTrades as TradeRow[]) {
      let currentPrice: number | null = null
      let stopAlertFired = false
      let target1AlertFired = false
      let target2AlertFired = false
      let emailSent: boolean | null = null

      try {
        const priceData = await marketDataProvider.fetchPrice(trade.ticker)

        if (!priceData) {
          console.warn(
            `[trade-monitor] Skipping ${trade.ticker}: price provider returned null`
          )

          await supabase
            .from('trades')
            .update({ last_monitored_at: new Date().toISOString() })
            .eq('id', trade.id)

          monitored += 1
          tradeSummaries.push({
            ticker: trade.ticker,
            currentPrice: null,
            stopAlertFired,
            target1AlertFired,
            target2AlertFired,
            emailSent,
          })
          continue
        }

        currentPrice = Number(priceData.price ?? 0)

        await supabase
          .from('trades')
          .update({ last_monitored_at: new Date().toISOString() })
          .eq('id', trade.id)

        monitored += 1

        const sharesHeld = sharesHeldForTrade(trade)

        // Stop condition
        if (
          trade.stop_price_current != null &&
          currentPrice <= trade.stop_price_current
        ) {
          const existingStopAction = await getUnresolvedPendingAction({
            userId,
            ticker: trade.ticker,
            actionType: 'stop_alert',
          })

          if (!existingStopAction) {
            const dedupeResult = await checkDedupe({
              userId,
              ticker: trade.ticker,
              triggerType: 'stop_alert',
              triggerState: 'stop_crossed',
            })

            if (dedupeResult.allowed) {
              const pendingActionResult = await createPendingAction({
                userId,
                ticker: trade.ticker,
                actionType: 'stop_alert',
                urgency: 'urgent',
                title: `Stop hit: ${trade.ticker}`,
                message: `Current price $${currentPrice.toFixed(2)} has crossed the stop at $${Number(trade.stop_price_current).toFixed(2)}. Exit this position.`,
                tradeId: trade.id,
                expiresAt: undefined,
                payloadJson: {
                  currentPrice,
                  stopPrice: trade.stop_price_current,
                  entryPrice: trade.entry_price_actual,
                  sharesHeld,
                },
              })

              if (pendingActionResult.created) {
                await recordNotification({
                  userId,
                  ticker: trade.ticker,
                  triggerType: 'stop_alert',
                  triggerState: 'stop_crossed',
                  tradeId: trade.id,
                  pendingActionId: pendingActionResult.id,
                  cooldownMinutes: 120,
                })

                if (recipientEmail) {
                  const estimatedLoss =
                    (currentPrice - (trade.entry_price_actual ?? 0)) * sharesHeld
                  const estimatedLossPct = trade.entry_price_actual
                    ? ((currentPrice - trade.entry_price_actual) /
                        trade.entry_price_actual) *
                      100
                    : 0

                  const { subject, html } = stopAlert({
                    ticker: trade.ticker,
                    currentPrice,
                    stopPrice: trade.stop_price_current ?? 0,
                    entryPrice: trade.entry_price_actual ?? 0,
                    sharesHeld,
                    estimatedLoss: Number(estimatedLoss.toFixed(2)),
                    estimatedLossPct: Number(estimatedLossPct.toFixed(2)),
                    tradeId: trade.id,
                    appUrl: edgeConfig.appBaseUrl ?? '',
                  })

                  const emailResult = await sendEmail(
                    { to: recipientEmail, subject, html },
                    {
                      apiKey: edgeConfig.resendApiKey,
                      fromEmail: edgeConfig.resendFromEmail,
                    }
                  )

                  emailSent = emailResult.sent
                  if (!emailResult.sent) {
                    console.error(
                      `[trade-monitor] Stop email failed for ${trade.ticker}:`,
                      emailResult.reason
                    )
                  }
                }

                await supabase
                  .from('trades')
                  .update({ last_stop_alert_at: new Date().toISOString() })
                  .eq('id', trade.id)

                stopAlertFired = true
                stopAlertsFired += 1
              } else {
                console.error(
                  `[trade-monitor] Failed to create stop pending action for ${trade.ticker}: ${pendingActionResult.reason}`
                )
              }
            }
          }
        }

        // Target 1 condition
        if (
          trade.target_1_price != null &&
          currentPrice >= trade.target_1_price
        ) {
          const existingTargetAction = await getUnresolvedPendingAction({
            userId,
            ticker: trade.ticker,
            actionType: 'target_alert',
          })

          if (!existingTargetAction) {
            const dedupeResult = await checkDedupe({
              userId,
              ticker: trade.ticker,
              triggerType: 'target_alert',
              triggerState: 'target_1_crossed',
            })

            if (dedupeResult.allowed) {
              const pendingActionResult = await createPendingAction({
                userId,
                ticker: trade.ticker,
                actionType: 'target_alert',
                urgency: 'urgent',
                title: `Target 1 hit: ${trade.ticker}`,
                message: `Current price $${currentPrice.toFixed(2)} has reached Target 1 at $${Number(trade.target_1_price).toFixed(2)}. Consider taking profit.`,
                tradeId: trade.id,
                expiresAt: undefined,
                payloadJson: {
                  currentPrice,
                  targetPrice: trade.target_1_price,
                  targetNumber: 1,
                  entryPrice: trade.entry_price_actual,
                  sharesHeld,
                },
              })

              if (pendingActionResult.created) {
                await recordNotification({
                  userId,
                  ticker: trade.ticker,
                  triggerType: 'target_alert',
                  triggerState: 'target_1_crossed',
                  tradeId: trade.id,
                  pendingActionId: pendingActionResult.id,
                  cooldownMinutes: 120,
                })

                if (recipientEmail) {
                  const estimatedGain =
                    (currentPrice - (trade.entry_price_actual ?? 0)) * sharesHeld
                  const estimatedGainPct = trade.entry_price_actual
                    ? ((currentPrice - trade.entry_price_actual) /
                        trade.entry_price_actual) *
                      100
                    : 0

                  const { subject, html } = targetAlert({
                    ticker: trade.ticker,
                    currentPrice,
                    targetPrice: trade.target_1_price,
                    targetNumber: 1,
                    entryPrice: trade.entry_price_actual ?? 0,
                    sharesHeld,
                    estimatedGain: Number(estimatedGain.toFixed(2)),
                    estimatedGainPct: Number(estimatedGainPct.toFixed(2)),
                    tradeId: trade.id,
                    appUrl: edgeConfig.appBaseUrl ?? '',
                  })

                  const emailResult = await sendEmail(
                    { to: recipientEmail, subject, html },
                    {
                      apiKey: edgeConfig.resendApiKey,
                      fromEmail: edgeConfig.resendFromEmail,
                    }
                  )

                  emailSent = emailSent || emailResult.sent
                  if (!emailResult.sent) {
                    console.error(
                      `[trade-monitor] Target 1 email failed for ${trade.ticker}:`,
                      emailResult.reason
                    )
                  }
                }

                await supabase
                  .from('trades')
                  .update({ last_target_1_alert_at: new Date().toISOString() })
                  .eq('id', trade.id)

                target1AlertFired = true
                target1AlertsFired += 1
              } else {
                console.error(
                  `[trade-monitor] Failed to create target 1 pending action for ${trade.ticker}: ${pendingActionResult.reason}`
                )
              }
            }
          }
        }

        // Target 2 condition
        if (
          trade.target_2_price != null &&
          currentPrice >= trade.target_2_price
        ) {
          const existingTargetAction = await getUnresolvedPendingAction({
            userId,
            ticker: trade.ticker,
            actionType: 'target_alert',
          })

          if (!existingTargetAction) {
            const dedupeResult = await checkDedupe({
              userId,
              ticker: trade.ticker,
              triggerType: 'target_alert',
              triggerState: 'target_2_crossed',
            })

            if (dedupeResult.allowed) {
              const pendingActionResult = await createPendingAction({
                userId,
                ticker: trade.ticker,
                actionType: 'target_alert',
                urgency: 'urgent',
                title: `Target 2 hit: ${trade.ticker}`,
                message: `Current price $${currentPrice.toFixed(2)} has reached Target 2 at $${Number(trade.target_2_price).toFixed(2)}. Consider taking profit.`,
                tradeId: trade.id,
                expiresAt: undefined,
                payloadJson: {
                  currentPrice,
                  targetPrice: trade.target_2_price,
                  targetNumber: 2,
                  entryPrice: trade.entry_price_actual,
                  sharesHeld,
                },
              })

              if (pendingActionResult.created) {
                await recordNotification({
                  userId,
                  ticker: trade.ticker,
                  triggerType: 'target_alert',
                  triggerState: 'target_2_crossed',
                  tradeId: trade.id,
                  pendingActionId: pendingActionResult.id,
                  cooldownMinutes: 120,
                })

                if (recipientEmail) {
                  const estimatedGain =
                    (currentPrice - (trade.entry_price_actual ?? 0)) * sharesHeld
                  const estimatedGainPct = trade.entry_price_actual
                    ? ((currentPrice - trade.entry_price_actual) /
                        trade.entry_price_actual) *
                      100
                    : 0

                  const { subject, html } = targetAlert({
                    ticker: trade.ticker,
                    currentPrice,
                    targetPrice: trade.target_2_price,
                    targetNumber: 2,
                    entryPrice: trade.entry_price_actual ?? 0,
                    sharesHeld,
                    estimatedGain: Number(estimatedGain.toFixed(2)),
                    estimatedGainPct: Number(estimatedGainPct.toFixed(2)),
                    tradeId: trade.id,
                    appUrl: edgeConfig.appBaseUrl ?? '',
                  })

                  const emailResult = await sendEmail(
                    { to: recipientEmail, subject, html },
                    {
                      apiKey: edgeConfig.resendApiKey,
                      fromEmail: edgeConfig.resendFromEmail,
                    }
                  )

                  emailSent = emailSent || emailResult.sent
                  if (!emailResult.sent) {
                    console.error(
                      `[trade-monitor] Target 2 email failed for ${trade.ticker}:`,
                      emailResult.reason
                    )
                  }
                }

                await supabase
                  .from('trades')
                  .update({ last_target_2_alert_at: new Date().toISOString() })
                  .eq('id', trade.id)

                target2AlertFired = true
                target2AlertsFired += 1
              } else {
                console.error(
                  `[trade-monitor] Failed to create target 2 pending action for ${trade.ticker}: ${pendingActionResult.reason}`
                )
              }
            }
          }
        }

        tradeSummaries.push({
          ticker: trade.ticker,
          currentPrice,
          stopAlertFired,
          target1AlertFired,
          target2AlertFired,
          emailSent,
        })
      } catch (error) {
        console.error(
          `[trade-monitor] Trade processing failed for ${trade.ticker}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )

        tradeSummaries.push({
          ticker: trade.ticker,
          currentPrice,
          stopAlertFired,
          target1AlertFired,
          target2AlertFired,
          emailSent,
        })
      }
    }

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message: `Trade monitor completed. Monitored: ${monitored}, stop alerts: ${stopAlertsFired}, target 1 alerts: ${target1AlertsFired}, target 2 alerts: ${target2AlertsFired}`,
      changesJson: {
        monitored,
        stopAlertsFired,
        target1AlertsFired,
        target2AlertsFired,
        windowKey,
        tradeSummaries,
      },
    })

    return jsonResponse(
      {
        success: true,
        monitored,
        stopAlertsFired,
        target1AlertsFired,
        target2AlertsFired,
        windowKey,
      },
      200
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unexpected trade monitor error'

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