'use client'

import { PendingAction } from '@/app/trading/inbox/page'
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
  if (urgency === 'urgent') return 'bg-[#f0a3a3]'
  if (urgency === 'normal') return 'bg-[#e7c98a]'
  return 'bg-[#7f8a98]'
}

function getActionTypeBadge(actionType: PendingAction['action_type']) {
  const labelMap: Record<PendingAction['action_type'], string> = {
    buy_signal: 'Buy signal',
    stop_alert: 'Stop alert',
    target_alert: 'Target alert',
    watchlist_review: 'Watchlist review',
    watchlist_removal: 'Watchlist removal',
    manual_reconciliation: 'Manual reconciliation',
    streak_alert: 'Streak alert',
    hold_alert: '8-Week hold',
  }

  return (
    <span className="ui-pill-neutral text-xs">
      {labelMap[actionType] ?? actionType}
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
      headerClass:
        'rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 dark:border-[#5a2d33] dark:bg-[#3a2227] dark:text-[#f0a3a3]',
    },
    {
      title: 'Normal',
      actions: normal,
      headerClass:
        'rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-800 dark:border-[#2a313b] dark:bg-[#20262e] dark:text-[#c7d0db]',
    },
    {
      title: 'Low',
      actions: low,
      headerClass:
        'rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-800 dark:border-[#2a313b] dark:bg-[#20262e] dark:text-[#c7d0db]',
    },
  ].filter((group) => group.actions.length > 0)

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.title} className="space-y-3">
          <div className={group.headerClass}>{group.title}</div>

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
                            <div className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                              {action.ticker}
                            </div>
                            <div className="mt-0.5 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                              {action.title}
                            </div>
                            {action.message ? (
                              <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                                {action.message}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>{getActionTypeBadge(action.action_type)}</td>
                      <td className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                        {formatRelativeTime(action.created_at)}
                      </td>
                      <td className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
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

                          {action.action_type === 'stop_alert' ||
                          action.action_type === 'target_alert' ? (
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