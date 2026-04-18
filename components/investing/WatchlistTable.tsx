'use client'

import Link from 'next/link'
import type { WatchlistItem } from '@/app/investing/types'

type Props = {
  items: WatchlistItem[]
  onEdit: (item: WatchlistItem) => void
  onDelete: (item: WatchlistItem) => void
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

export function WatchlistTable({
  items,
  onEdit,
  onDelete,
  deletingId = null,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        No matching watchlist items found.
      </div>
    )
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Company</th>
            <th>Sector</th>
            <th>Status</th>
            <th>Current Price</th>
            <th>Target Entry</th>
            <th>Discount</th>
            <th>Score</th>
            <th>Date Added</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="font-medium">
                <Link
                  href={`/investing/ticker/${encodeURIComponent(item.ticker)}`}
                  className="text-[#3346cc] underline-offset-2 hover:underline dark:text-[#9db2ff]"
                >
                  {item.ticker}
                </Link>
              </td>
              <td>{item.company}</td>
              <td>{item.sector}</td>
              <td>{item.status}</td>
              <td>{formatCurrency(item.current_price)}</td>
              <td>{formatCurrency(item.target_entry)}</td>
              <td>{formatPercent(item.discount_to_entry)}</td>
              <td>
                {item.scorecard_overall == null ? '—' : item.scorecard_overall.toFixed(1)}
              </td>
              <td>{formatDate(item.date_added)}</td>
              <td>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="ui-btn-secondary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="ui-btn-secondary"
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? 'Deleting...' : 'Delete'}
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