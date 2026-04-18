'use client'

import type { QuarterlyReview } from '@/app/investing/types'
import { DataCardRow } from '@/components/ui/DataCardRow'

type Props = {
  reviews: QuarterlyReview[]
  onEdit: (review: QuarterlyReview) => void
  onDelete: (review: QuarterlyReview) => void
  deletingId?: string | null
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
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

function getAlphaTone(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return 'text-neutral-500 dark:text-[#a8b2bf]'
  if (value > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (value < 0) return 'text-red-600 dark:text-red-400'
  return 'text-neutral-600 dark:text-[#c7d0db]'
}

export function QuarterlyReviewsCardList({
  reviews,
  onEdit,
  onDelete,
  deletingId = null,
}: Props) {
  if (reviews.length === 0) {
    return (
      <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        No reviews found.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review.id} className="ui-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                {review.quarter} review
              </div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                {formatDate(review.review_date)}
              </div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                {review.cycle_phase ?? 'No cycle phase recorded'}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className={`text-right text-xs font-medium ${getAlphaTone(review.alpha)}`}>
                Alpha {formatPercent(review.alpha)}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(review)}
                  className="ui-btn-secondary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(review)}
                  className="ui-btn-secondary"
                  disabled={deletingId === review.id}
                >
                  {deletingId === review.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <DataCardRow
              label="Portfolio value"
              value={formatCurrency(review.portfolio_value)}
            />
            <DataCardRow
              label="Quarter return"
              value={formatPercent(review.quarter_return)}
            />
            <DataCardRow
              label="YTD return"
              value={formatPercent(review.ytd_return)}
            />
            <DataCardRow
              label="S&P YTD"
              value={formatPercent(review.sp500_ytd)}
            />
            <DataCardRow
              label="Holdings"
              value={review.num_holdings == null ? '—' : String(review.num_holdings)}
            />
            <DataCardRow
              label="Cash"
              value={formatPercent(review.cash_pct)}
            />
          </div>

          {review.top_lesson ? (
            <div className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Top lesson:
              </span>{' '}
              {review.top_lesson}
            </div>
          ) : null}

          {review.action_items ? (
            <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Action items:
              </span>{' '}
              {review.action_items}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}