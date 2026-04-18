'use client'

import type { QuarterlyReview } from '@/app/investing/types'

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

export function QuarterlyReviewsTable({
  reviews,
  onEdit,
  onDelete,
  deletingId = null,
}: Props) {
  if (reviews.length === 0) {
    return (
      <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        No matching reviews found.
      </div>
    )
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            <th>Quarter</th>
            <th>Review Date</th>
            <th>Portfolio Value</th>
            <th>Quarter Return</th>
            <th>YTD Return</th>
            <th>S&amp;P Quarter</th>
            <th>S&amp;P YTD</th>
            <th>Alpha</th>
            <th>Cycle Phase</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => (
            <tr key={review.id}>
              <td className="font-medium">{review.quarter}</td>
              <td>{formatDate(review.review_date)}</td>
              <td>{formatCurrency(review.portfolio_value)}</td>
              <td>{formatPercent(review.quarter_return)}</td>
              <td>{formatPercent(review.ytd_return)}</td>
              <td>{formatPercent(review.sp500_quarter)}</td>
              <td>{formatPercent(review.sp500_ytd)}</td>
              <td className={getAlphaTone(review.alpha)}>{formatPercent(review.alpha)}</td>
              <td>{review.cycle_phase ?? '—'}</td>
              <td>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}