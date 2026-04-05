'use client'

import { PendingAction } from '@/app/inbox/page'
import { PendingActionCard } from './PendingActionCard'

type Props = {
  actions: PendingAction[]
  executingId: string | null
  onExecuteBuy: (action: PendingAction) => void
  onExecuteSell: (action: PendingAction, mode: 'full' | 'partial') => void
  onDismiss: (actionId: string) => void | Promise<void>
  onSnooze: (actionId: string) => void | Promise<void>
  onArchiveWatchlistItem: (action: PendingAction) => void | Promise<void>
}

function formatRelativeTime(dateString: string) {
  const diffMs = new Date(dateString).getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / (1000 * 60))
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  const absMinutes = Math.abs(diffMinutes)
  if (absMinutes < 60) return rtf.format(diffMinutes, 'minute')

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')

  const diffDays = Math.round(diffHours / 24)
  return rtf.format(diffDays, 'day')
}

function getUrgencyDotClass(urgency: PendingAction['urgency']) {
  if (urgency === 'urgent') return 'bg-red-500'
  if (urgency === 'normal') return 'bg-amber-500'
  return 'bg-neutral-400'
}

function getActionTypeBadge(actionType: PendingAction['action_type']) {
  const labelMap: Record<PendingAction['action_type'], string> = {
    buy_signal: 'Buy signal',
    stop_alert: 'Stop alert',
    target_alert: 'Target alert',
    watchlist_review: 'Watchlist review',
    manual_reconciliation: 'Manual reconciliation',
  }

  return (
    <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700">
      {labelMap[actionType]}
    </span>
  )
}

export function PendingActionsTable({
  actions,
  executingId,
  onExecuteBuy,
  onExecuteSell,
  onDismiss,
  onSnooze,
  onArchiveWatchlistItem,
}: Props) {
  if (actions.length === 0) {
    return (
        <div className="ui-card text-sm text-neutral-600 dark:text-[#a8b2bf]">
             No pending actions. The system is up to date.
        </div>
    )
  }

  const urgent = actions.filter((action) => action.urgency === 'urgent')
  const normal = actions.filter((action) => action.urgency === 'normal')
  const low = actions.filter((action) => action.urgency === 'low')

  const groups = [
    {
      title: 'Urgent',
      actions: urgent,
      headerClass: 'border-red-200 bg-red-50 text-red-800',
    },
    {
      title: 'Normal',
      actions: normal,
      headerClass: 'border-neutral-200 bg-neutral-50 text-neutral-800',
    },
    {
      title: 'Low',
      actions: low,
      headerClass: 'border-neutral-200 bg-neutral-50 text-neutral-800',
    },
  ].filter((group) => group.actions.length > 0)

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.title} className="space-y-3">
          <div
            className={`rounded-2xl border px-4 py-2 text-sm font-medium ${group.headerClass}`}
          >
            {group.title}
          </div>

          <div className="hidden md:block ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.actions.map((action) => {
                  const isBusy = executingId === action.id

                  return (
                    <tr key={action.id}>
                      <td>
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-2 h-2.5 w-2.5 rounded-full ${getUrgencyDotClass(action.urgency)}`}
                          />
                          <div>
                            <div className="font-semibold text-neutral-900">{action.ticker}</div>
                            <div className="mt-0.5 text-sm font-medium text-neutral-900">
                              {action.title}
                            </div>
                            {action.message ? (
                              <div className="mt-1 text-sm text-neutral-500">
                                {action.message}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>{getActionTypeBadge(action.action_type)}</td>
                      <td className="text-sm text-neutral-600">
                        {formatRelativeTime(action.created_at)}
                      </td>
                      <td className="text-sm text-neutral-600">
                        {action.expires_at
                          ? new Date(action.expires_at).toLocaleString()
                          : '—'}
                      </td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-2">
                          {action.action_type === 'buy_signal' ? (
                            <>
                              <button
                                type="button"
                                className="ui-btn-primary"
                                onClick={() => onExecuteBuy(action)}
                                disabled={isBusy}
                              >
                                {isBusy ? 'Working...' : 'Execute'}
                              </button>
                              <button
                                type="button"
                                className="ui-btn-secondary"
                                onClick={() => onDismiss(action.id)}
                                disabled={isBusy}
                              >
                                Dismiss
                              </button>
                              <button
                                type="button"
                                className="ui-btn-secondary"
                                onClick={() => onSnooze(action.id)}
                                disabled={isBusy}
                              >
                                Snooze 1h
                              </button>
                            </>
                          ) : null}

                          {(action.action_type === 'stop_alert' ||
                            action.action_type === 'target_alert') ? (
                            <>
                              <button
                                type="button"
                                className="ui-btn-danger"
                                onClick={() => onExecuteSell(action, 'full')}
                                disabled={isBusy}
                              >
                                {isBusy ? 'Working...' : 'Execute Full'}
                              </button>
                              <button
                                type="button"
                                className="ui-btn-primary"
                                onClick={() => onExecuteSell(action, 'partial')}
                                disabled={isBusy}
                              >
                                Execute Partial
                              </button>
                              <button
                                type="button"
                                className="ui-btn-secondary"
                                onClick={() => onSnooze(action.id)}
                                disabled={isBusy}
                              >
                                Snooze 1h
                              </button>
                            </>
                          ) : null}

                          {action.action_type === 'watchlist_review' ? (
                            <>
                              <button
                                type="button"
                                className="ui-btn-secondary"
                                onClick={() => onDismiss(action.id)}
                                disabled={isBusy}
                              >
                                Keep
                              </button>
                              <button
                                type="button"
                                className="ui-btn-danger"
                                onClick={() => onArchiveWatchlistItem(action)}
                                disabled={isBusy}
                              >
                                Archive
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {group.actions.map((action) => (
              <PendingActionCard
                key={action.id}
                action={action}
                executing={executingId === action.id}
                onExecuteBuy={onExecuteBuy}
                onExecuteSell={onExecuteSell}
                onDismiss={onDismiss}
                onSnooze={onSnooze}
                onArchiveWatchlistItem={onArchiveWatchlistItem}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}