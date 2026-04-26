'use client'

import Link from 'next/link'
import type { Holding, StockAnalysis } from '@/app/investing/types'

type EnrichedHolding = Holding & {
  latest_analysis_overall_score?: number | null
  latest_analysis_verdict?: StockAnalysis['verdict'] | null
  latest_analysis_confidence?: StockAnalysis['confidence'] | string | null
  latest_analysis_fair_value_low?: number | null
  latest_analysis_fair_value_high?: number | null
  latest_analysis_date?: string | null
  valuation_status?: 'Below fair value' | 'Within range' | 'Above fair value' | null
  portfolio_action_hint?: 'Add candidate' | 'Hold' | 'Trim candidate' | 'Review thesis' | null
}

type Props = {
  holdings: EnrichedHolding[]
  onEdit: (holding: EnrichedHolding) => void
  onDelete: (holding: EnrichedHolding) => void
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

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(1)
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
            <th>Analysis Score</th>
            <th>Verdict</th>
            <th>Confidence</th>
            <th>Valuation Status</th>
            <th>Action Hint</th>
            <th>Analysis Date</th>
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
              <td>{formatScore(holding.latest_analysis_overall_score)}</td>
              <td>{holding.latest_analysis_verdict ?? '—'}</td>
              <td>{holding.latest_analysis_confidence ?? '—'}</td>
              <td>{holding.valuation_status ?? '—'}</td>
              <td>{holding.portfolio_action_hint ?? '—'}</td>
              <td>{formatDate(holding.latest_analysis_date)}</td>
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