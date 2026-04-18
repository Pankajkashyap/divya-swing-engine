'use client'

import Link from 'next/link'
import type { DecisionJournalEntry } from '@/app/investing/types'

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

export function DecisionJournalTable({
  entries,
  onEdit,
  onDelete,
  deletingId = null,
}: Props) {
  if (entries.length === 0) {
    return (
      <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        No matching journal entries found.
      </div>
    )
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Ticker</th>
            <th>Action</th>
            <th>Account</th>
            <th>Shares</th>
            <th>Price</th>
            <th>Weight After</th>
            <th>Emotion</th>
            <th>3M Review</th>
            <th>12M Review</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.entry_number}</td>
              <td>{formatDate(entry.entry_date)}</td>
              <td className="font-medium">
                <Link
                  href={`/investing/ticker/${encodeURIComponent(entry.ticker)}`}
                  className="text-[#3346cc] underline-offset-2 hover:underline dark:text-[#9db2ff]"
                >
                  {entry.ticker}
                </Link>
              </td>
              <td>{entry.action}</td>
              <td>{entry.account}</td>
              <td>{entry.shares == null ? '—' : entry.shares}</td>
              <td>{formatCurrency(entry.price)}</td>
              <td>{formatPercent(entry.portfolio_weight_after)}</td>
              <td>{entry.emotional_state ?? '—'}</td>
              <td>{formatDate(entry.review_due_3m)}</td>
              <td>{formatDate(entry.review_due_12m)}</td>
              <td>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}