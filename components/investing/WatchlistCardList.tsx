'use client'

import Link from 'next/link'
import type { WatchlistItem } from '@/app/investing/types'
import { DataCardRow } from '@/components/ui/DataCardRow'

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

function getStatusTone(status: WatchlistItem['status']) {
  switch (status) {
    case 'Ready to buy':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'Watching — approaching entry':
      return 'text-amber-600 dark:text-amber-400'
    case 'Watching — overvalued':
      return 'text-red-600 dark:text-red-400'
    case 'Under research':
      return 'text-blue-600 dark:text-blue-400'
    case 'Removed':
      return 'text-neutral-500 dark:text-[#a8b2bf]'
    default:
      return 'text-neutral-600 dark:text-[#a8b2bf]'
  }
}

export function WatchlistCardList({
  items,
  onEdit,
  onDelete,
  deletingId = null,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        No watchlist items found.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="ui-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                <Link
                  href={`/investing/ticker/${encodeURIComponent(item.ticker)}`}
                  className="text-[#3346cc] underline-offset-2 hover:underline dark:text-[#9db2ff]"
                >
                  {item.ticker}
                </Link>
              </div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                {item.company}
              </div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                {item.sector}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className={`text-right text-xs font-medium ${getStatusTone(item.status)}`}>
                {item.status}
              </div>
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
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <DataCardRow label="Current price" value={formatCurrency(item.current_price)} />
            <DataCardRow label="Target entry" value={formatCurrency(item.target_entry)} />
            <DataCardRow
              label="Fair value"
              value={
                item.fair_value_low != null || item.fair_value_high != null
                  ? `${formatCurrency(item.fair_value_low)} – ${formatCurrency(item.fair_value_high)}`
                  : '—'
              }
            />
            <DataCardRow label="Discount to entry" value={formatPercent(item.discount_to_entry)} />
          </div>

          {item.why_watching ? (
            <div className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              {item.why_watching}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}