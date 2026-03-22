'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AppHeader } from '@/components/AppHeader'
import { PendingActionsTable } from '@/components/inbox/PendingActionsTable'
import { NotificationLogTable } from '@/components/inbox/NotificationLogTable'
import { ExecuteBuyDialog } from '@/components/inbox/ExecuteBuyDialog'
import { ExecuteSellDialog } from '@/components/inbox/ExecuteSellDialog'

export type PendingAction = {
  id: string
  ticker: string
  action_type:
    | 'buy_signal'
    | 'stop_alert'
    | 'target_alert'
    | 'watchlist_review'
    | 'manual_reconciliation'
  state:
    | 'awaiting_confirmation'
    | 'snoozed'
    | 'dismissed'
    | 'executed'
    | 'expired'
  urgency: 'urgent' | 'normal' | 'low'
  title: string
  message: string | null
  payload_json: Record<string, unknown>
  trade_id: string | null
  watchlist_id: string | null
  trade_plan_id: string | null
  created_at: string
  expires_at: string | null
  snoozed_until: string | null
}

export type NotificationLog = {
  id: string
  ticker: string | null
  trigger_type: string
  trigger_state: string
  sent_at: string
  resolved_at: string | null
}

type SellDialogState = {
  action: PendingAction
  mode: 'full' | 'partial'
} | null

type BuyExecutionParams = {
  actualFillPrice: number
  actualQuantity: number
  notes: string
}

type SellExecutionParams = {
  exitPrice: number
  exitShares: number
  notes: string
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export default function InboxPage() {
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [buyDialogAction, setBuyDialogAction] = useState<PendingAction | null>(null)
  const [sellDialogAction, setSellDialogAction] = useState<SellDialogState>(null)

  const loadPendingActions = useCallback(async () => {
    const { data, error } = await supabase
      .from('pending_actions')
      .select(
        'id, ticker, action_type, state, urgency, title, message, payload_json, trade_id, watchlist_id, trade_plan_id, created_at, expires_at, snoozed_until'
      )
      .eq('state', 'awaiting_confirmation')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Pending actions load error:', error)
      return
    }

    const urgencyOrder: Record<PendingAction['urgency'], number> = {
      urgent: 0,
      normal: 1,
      low: 2,
    }

    const rows = (data ?? []) as PendingAction[]
    const sorted = rows.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      if (urgencyDiff !== 0) return urgencyDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    setPendingActions(sorted)
  }, [])

  const loadNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, ticker, trigger_type, trigger_state, sent_at, resolved_at')
      .order('sent_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Notifications load error:', error)
      return
    }

    setNotifications((data ?? []) as NotificationLog[])
  }, [])


  useEffect(() => {
    let cancelled = false

    const run = async () => {
      await Promise.all([loadPendingActions(), loadNotifications()])
      if (!cancelled) setLoading(false)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [loadNotifications, loadPendingActions])

  const pendingCountLabel = useMemo(() => {
    return `${pendingActions.length} pending`
  }, [pendingActions.length])

  const handleDismiss = async (actionId: string) => {
    setExecutingId(actionId)

    const { error } = await supabase
      .from('pending_actions')
      .update({
        state: 'dismissed',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', actionId)

    if (error) {
      console.error('Dismiss action error:', error)
      alert('Failed to dismiss action')
      setExecutingId(null)
      return
    }

    await loadPendingActions()
    setExecutingId(null)
  }

  const handleSnooze = async (actionId: string) => {
    setExecutingId(actionId)

    const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('pending_actions')
      .update({
        state: 'snoozed',
        snoozed_until: snoozedUntil,
      })
      .eq('id', actionId)

    if (error) {
      console.error('Snooze action error:', error)
      alert('Failed to snooze action')
      setExecutingId(null)
      return
    }

    await loadPendingActions()
    setExecutingId(null)
  }

  const handleArchiveWatchlistItem = async (action: PendingAction) => {
    if (!action.watchlist_id) {
      alert('Watchlist item is missing')
      return
    }

    setExecutingId(action.id)

    const { error: watchlistError } = await supabase
      .from('watchlist')
      .update({ signal_state: 'archived' })
      .eq('id', action.watchlist_id)

    if (watchlistError) {
      console.error('Archive watchlist error:', watchlistError)
      alert('Failed to archive watchlist item')
      setExecutingId(null)
      return
    }

    const { error: pendingActionError } = await supabase
      .from('pending_actions')
      .update({
        state: 'dismissed',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', action.id)

    if (pendingActionError) {
      console.error('Dismiss pending action after archive error:', pendingActionError)
      alert('Failed to dismiss pending action')
      setExecutingId(null)
      return
    }

    await loadPendingActions()
    setExecutingId(null)
  }

  const handleExecuteBuy = async (
    action: PendingAction,
    params: BuyExecutionParams
  ) => {
    setExecutingId(action.id)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert('You must be logged in')
      setExecutingId(null)
      return
    }

    const stopPrice = asNumber(action.payload_json?.stop_price)
    const target1Price = asNumber(action.payload_json?.target_1_price)
    const target2Price = asNumber(action.payload_json?.target_2_price)

    const { error: tradeError } = await supabase.from('trades').insert({
      user_id: user.id,
      ticker: action.ticker,
      trade_plan_id: action.trade_plan_id,
      side: 'long',
      status: 'open',
      trade_state: 'open',
      entry_date: getTodayDateString(),
      entry_price_actual: params.actualFillPrice,
      shares_entered: params.actualQuantity,
      stop_price_initial: stopPrice,
      stop_price_current: stopPrice,
      target_1_price: target1Price,
      target_2_price: target2Price,
      notes: params.notes || null,
    })

    if (tradeError) {
      console.error('Create trade error:', tradeError)
      alert('Failed to execute buy')
      setExecutingId(null)
      return
    }

    const { error: executionLogError } = await supabase.from('execution_log').insert({
      user_id: user.id,
      ticker: action.ticker,
      execution_type: 'buy',
      quantity: params.actualQuantity,
      price: params.actualFillPrice,
      notes: params.notes || null,
      pending_action_id: action.id,
    })

    if (executionLogError) {
      console.error('Execution log insert error:', executionLogError)
      alert('Buy was created, but execution log failed')
      setExecutingId(null)
      return
    }

    const { error: pendingActionError } = await supabase
      .from('pending_actions')
      .update({
        state: 'executed',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', action.id)

    if (pendingActionError) {
      console.error('Resolve pending action error:', pendingActionError)
      alert('Trade created, but pending action update failed')
      setExecutingId(null)
      return
    }

    if (action.watchlist_id) {
      const { error: watchlistError } = await supabase
        .from('watchlist')
        .update({ signal_state: 'converted_to_trade' })
        .eq('id', action.watchlist_id)

      if (watchlistError) {
        console.error('Watchlist signal state update error:', watchlistError)
      }
    }

    if (action.trade_plan_id) {
      const { error: tradePlanError } = await supabase
        .from('trade_plans')
        .update({ approval_status: 'executed' })
        .eq('id', action.trade_plan_id)

      if (tradePlanError) {
        console.error('Trade plan update error:', tradePlanError)
      }
    }

    setBuyDialogAction(null)
    await Promise.all([loadPendingActions(), loadNotifications()])
    setExecutingId(null)
  }

  const handleExecuteSell = async (
    action: PendingAction,
    params: SellExecutionParams,
    mode: 'full' | 'partial'
  ) => {
    if (!action.trade_id) {
      alert('Trade is missing on this action')
      return
    }

    setExecutingId(action.id)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert('You must be logged in')
      setExecutingId(null)
      return
    }

    const { data: trade, error: tradeLoadError } = await supabase
      .from('trades')
      .select(
        'id, side, entry_price_actual, shares_entered, shares_exited, pnl_dollar, pnl_pct'
      )
      .eq('id', action.trade_id)
      .single()

    if (tradeLoadError || !trade) {
      console.error('Trade load error:', tradeLoadError)
      alert('Failed to find trade for sell execution')
      setExecutingId(null)
      return
    }

    const entryPrice = Number(trade.entry_price_actual ?? 0)
    const sharesEntered = Number(trade.shares_entered ?? 0)
    const sharesExitedAlready = Number(trade.shares_exited ?? 0)
    const openShares = sharesEntered - sharesExitedAlready

    if (!entryPrice || !sharesEntered || openShares <= 0) {
      alert('Trade data is incomplete')
      setExecutingId(null)
      return
    }

    if (params.exitShares > openShares) {
      alert('Exit shares cannot exceed open shares')
      setExecutingId(null)
      return
    }

    let pnlDelta = 0
    if (trade.side === 'long') {
      pnlDelta = (params.exitPrice - entryPrice) * params.exitShares
    } else {
      pnlDelta = (entryPrice - params.exitPrice) * params.exitShares
    }

    const existingPnlDollar = Number(trade.pnl_dollar ?? 0)
    const finalPnlDollar = Number((existingPnlDollar + pnlDelta).toFixed(2))
    const originalCostBasis = entryPrice * sharesEntered
    const finalPnlPct =
      originalCostBasis > 0
        ? Number(((finalPnlDollar / originalCostBasis) * 100).toFixed(2))
        : 0

    if (mode === 'full') {
      const { error: updateTradeError } = await supabase
        .from('trades')
        .update({
          status: 'closed',
          trade_state: 'closed',
          exit_price_actual: params.exitPrice,
          exit_date: getTodayDateString(),
          shares_exited: sharesEntered,
          pnl_dollar: finalPnlDollar,
          pnl_pct: finalPnlPct,
        })
        .eq('id', action.trade_id)

      if (updateTradeError) {
        console.error('Full sell update trade error:', updateTradeError)
        alert('Failed to execute full sale')
        setExecutingId(null)
        return
      }
    } else {
      const newSharesExited = sharesExitedAlready + params.exitShares
      const sharesRemaining = sharesEntered - newSharesExited

      const { error: updateTradeError } = await supabase
        .from('trades')
        .update({
          status: sharesRemaining > 0 ? 'partial' : 'closed',
          trade_state: sharesRemaining > 0 ? 'partial' : 'closed',
          shares_exited: newSharesExited,
          shares_remaining: sharesRemaining,
          pnl_dollar: finalPnlDollar,
          pnl_pct: finalPnlPct,
          ...(sharesRemaining === 0
            ? {
                exit_price_actual: params.exitPrice,
                exit_date: getTodayDateString(),
              }
            : {}),
        })
        .eq('id', action.trade_id)

      if (updateTradeError) {
        console.error('Partial sell update trade error:', updateTradeError)
        alert('Failed to execute partial sale')
        setExecutingId(null)
        return
      }
    }

    const { error: executionLogError } = await supabase.from('execution_log').insert({
      user_id: user.id,
      ticker: action.ticker,
      execution_type: mode === 'full' ? 'sell_full' : 'sell_partial',
      quantity: params.exitShares,
      price: params.exitPrice,
      notes: params.notes || null,
      pending_action_id: action.id,
    })

    if (executionLogError) {
      console.error('Sell execution log error:', executionLogError)
      alert('Sale executed, but execution log failed')
      setExecutingId(null)
      return
    }

    const { error: pendingActionError } = await supabase
      .from('pending_actions')
      .update({
        state: 'executed',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', action.id)

    if (pendingActionError) {
      console.error('Resolve sell pending action error:', pendingActionError)
      alert('Sale executed, but pending action update failed')
      setExecutingId(null)
      return
    }

    setSellDialogAction(null)
    await Promise.all([loadPendingActions(), loadNotifications()])
    setExecutingId(null)
  }

  if (loading) {
    return <main className="p-10">Loading inbox...</main>
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <AppHeader
              title="Inbox"
              subtitle="Pending signals, alerts, and watchlist reviews."
            />
          </div>
          <div className="mt-6 inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm font-medium text-neutral-700">
            {pendingCountLabel}
          </div>
        </div>

        <section className="ui-section">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">Pending Actions</h2>
          </div>

          <PendingActionsTable
            actions={pendingActions}
            executingId={executingId}
            onExecuteBuy={(action: PendingAction) => setBuyDialogAction(action)}
            onExecuteSell={(action: PendingAction, mode: 'full' | 'partial') =>
              setSellDialogAction({ action, mode })
            }
            onDismiss={handleDismiss}
            onSnooze={handleSnooze}
            onArchiveWatchlistItem={handleArchiveWatchlistItem}
          />
        </section>

        <section className="ui-section mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Notification Log</h2>
          </div>

          <NotificationLogTable notifications={notifications} />
        </section>
      </section>

      {buyDialogAction ? (
        <ExecuteBuyDialog
          action={buyDialogAction}
          onConfirm={(params: BuyExecutionParams) =>
            handleExecuteBuy(buyDialogAction, params)
          }
          onCancel={() => setBuyDialogAction(null)}
        />
      ) : null}

      {sellDialogAction ? (
        <ExecuteSellDialog
          action={sellDialogAction.action}
          mode={sellDialogAction.mode}
          onConfirm={(params: SellExecutionParams) =>
            handleExecuteSell(sellDialogAction.action, params, sellDialogAction.mode)
          }
          onCancel={() => setSellDialogAction(null)}
        />
      ) : null}
    </main>
  )
}