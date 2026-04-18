'use client'

import Link from 'next/link'
import type { Holding } from '@/app/investing/types'

type Props = {
  holdings: Holding[]
  onEdit: (holding: Holding) => void
  onDelete: (holding: Holding) => void
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

function formatCurrencyRounded(value: number | null | undefined) {
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

export function HoldingsTable({
  holdings,
  onEdit,
  onDelete,
  deletingId = null,
}: Props) {
  if (holdings.length === 0) {
    return (
      <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        No holdings found.
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
            <th>Account</th>
            <th>Bucket</th>
            <th>Sector</th>
            <th>Shares</th>
            <th>Avg Cost</th>
            <th>Current Price</th>
            <th>Market Value</th>
            <th>Gain/Loss</th>
            <th>Date Bought</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => (
            <tr key={holding.id}>
              <td className="font-medium">
                <Link
                  href={`/investing/ticker/${encodeURIComponent(holding.ticker)}`}
                  className="text-[#3346cc] underline-offset-2 hover:underline dark:text-[#9db2ff]"
                >
                  {holding.ticker}
                </Link>
              </td>
              <td>{holding.company}</td>
              <td>{holding.account}</td>
              <td>{holding.bucket}</td>
              <td>{holding.sector}</td>
              <td>{holding.shares}</td>
              <td>{formatCurrency(holding.avg_cost)}</td>
              <td>{formatCurrency(holding.current_price)}</td>
              <td>{formatCurrencyRounded(holding.market_value)}</td>
              <td>{formatPercent(holding.gain_loss_pct)}</td>
              <td>{formatDate(holding.date_bought)}</td>
              <td>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(holding)}
                    className="ui-btn-secondary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(holding)}
                    className="ui-btn-secondary"
                    disabled={deletingId === holding.id}
                  >
                    {deletingId === holding.id ? 'Deleting...' : 'Delete'}
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