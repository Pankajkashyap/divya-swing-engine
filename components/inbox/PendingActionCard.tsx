'use client'

import { PendingAction } from '@/app/inbox/page'

type Props = {
  action: PendingAction
  executing: boolean
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

export function PendingActionCard({
  action,
  executing,
  onExecuteBuy,
  onExecuteSell,
  onDismiss,
  onSnooze,
  onArchiveWatchlistItem,
}: Props) {
  return (
    <div className="ui-card p-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-2 h-2.5 w-2.5 rounded-full ${getUrgencyDotClass(action.urgency)}`}
        />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {action.ticker}
          </div>
          <div className="mt-1 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            {action.title}
          </div>
          {action.message ? (
            <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              {action.message}
            </div>
          ) : null}
          <div className="mt-2 text-xs text-neutral-500 dark:text-[#a8b2bf]">
            Created {formatRelativeTime(action.created_at)}
          </div>
          {action.expires_at ? (
            <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
              Expires {new Date(action.expires_at).toLocaleString()}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {action.action_type === 'buy_signal' ? (
          <>
            <button
              type="button"
              className="ui-btn-primary"
              onClick={() => onExecuteBuy(action)}
              disabled={executing}
            >
              {executing ? 'Working...' : 'Execute'}
            </button>
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => onDismiss(action.id)}
              disabled={executing}
            >
              Dismiss
            </button>
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => onSnooze(action.id)}
              disabled={executing}
            >
              Snooze 1h
            </button>
          </>
        ) : null}

        {action.action_type === 'stop_alert' || action.action_type === 'target_alert' ? (
          <>
            <button
              type="button"
              className="ui-btn-danger"
              onClick={() => onExecuteSell(action, 'full')}
              disabled={executing}
            >
              {executing ? 'Working...' : 'Execute Full'}
            </button>
            <button
              type="button"
              className="ui-btn-primary"
              onClick={() => onExecuteSell(action, 'partial')}
              disabled={executing}
            >
              Execute Partial
            </button>
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => onSnooze(action.id)}
              disabled={executing}
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
              disabled={executing}
            >
              Keep
            </button>
            <button
              type="button"
              className="ui-btn-danger"
              onClick={() => onArchiveWatchlistItem(action)}
              disabled={executing}
            >
              Archive
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}