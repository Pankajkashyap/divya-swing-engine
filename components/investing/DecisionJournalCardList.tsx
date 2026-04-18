'use client'

import Link from 'next/link'
import type { DecisionJournalEntry } from '@/app/investing/types'
import { DataCardRow } from '@/components/ui/DataCardRow'

type Props = {
  entries: DecisionJournalEntry[]
  onEdit: (entry: DecisionJournalEntry) => void
  onDelete: (entry: DecisionJournalEntry) => void
  deletingId?: string | null
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getActionTone(action: DecisionJournalEntry['action']) {
  switch (action) {
    case 'BUY':
    case 'ADD':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'SELL':
    case 'TRIM':
      return 'text-red-600 dark:text-red-400'
    case 'HOLD':
      return 'text-blue-600 dark:text-blue-400'
    default:
      return 'text-neutral-500 dark:text-[#a8b2bf]'
  }
}

export function DecisionJournalCardList({
  entries,
  onEdit,
  onDelete,
  deletingId = null,
}: Props) {
  if (entries.length === 0) {
    return (
      <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        No journal entries found.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="ui-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                <Link
                  href={`/investing/ticker/${encodeURIComponent(entry.ticker)}`}
                  className="text-[#3346cc] underline-offset-2 hover:underline dark:text-[#9db2ff]"
                >
                  {entry.ticker}
                </Link>
              </div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                {entry.account} · {formatDate(entry.entry_date)}
              </div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                Entry #{entry.entry_number}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className={`text-right text-xs font-medium ${getActionTone(entry.action)}`}>
                {entry.action}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(entry)}
                  className="ui-btn-secondary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(entry)}
                  className="ui-btn-secondary"
                  disabled={deletingId === entry.id}
                >
                  {deletingId === entry.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <DataCardRow label="Shares" value={entry.shares == null ? '—' : String(entry.shares)} />
            <DataCardRow label="Price" value={formatCurrency(entry.price)} />
            <DataCardRow
              label="Weight after"
              value={formatPercent(entry.portfolio_weight_after)}
            />
            <DataCardRow
              label="Score"
              value={entry.scorecard_overall == null ? '—' : entry.scorecard_overall.toFixed(1)}
            />
            <DataCardRow label="Emotion" value={entry.emotional_state ?? '—'} />
            <DataCardRow label="Framework" value={entry.framework_supported ?? '—'} />
          </div>

          {entry.reasoning ? (
            <div className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              {entry.reasoning}
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <DataCardRow label="3M review due" value={formatDate(entry.review_due_3m)} />
            <DataCardRow label="12M review due" value={formatDate(entry.review_due_12m)} />
          </div>
        </div>
      ))}
    </div>
  )
}