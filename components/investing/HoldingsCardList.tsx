'use client'

import Link from 'next/link'
import type { Holding, StockAnalysis } from '@/app/investing/types'
import { DataCardRow } from '@/components/ui/DataCardRow'

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

export function HoldingsCardList({
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
    <div className="space-y-3">
      {holdings.map((holding) => (
        <div key={holding.id} className="ui-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                <Link
                  href={`/investing/ticker/${encodeURIComponent(holding.ticker)}`}
                  className="text-[#3346cc] underline-offset-2 hover:underline dark:text-[#9db2ff]"
                >
                  {holding.ticker}
                </Link>
              </div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                {holding.company}
              </div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                {holding.account} · {holding.bucket}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="text-right text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                {formatCurrencyRounded(holding.market_value)}
              </div>
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
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <DataCardRow label="Sector" value={holding.sector} />
            <DataCardRow label="Shares" value={String(holding.shares)} />
            <DataCardRow label="Avg cost" value={formatCurrency(holding.avg_cost)} />
            <DataCardRow label="Current price" value={formatCurrency(holding.current_price)} />
            <DataCardRow label="Gain/Loss" value={formatPercent(holding.gain_loss_pct)} />
            <DataCardRow label="Date bought" value={formatDate(holding.date_bought)} />
            <DataCardRow
              label="Analysis score"
              value={formatScore(holding.latest_analysis_overall_score)}
            />
            <DataCardRow label="Verdict" value={holding.latest_analysis_verdict ?? '—'} />
            <DataCardRow label="Confidence" value={holding.latest_analysis_confidence ?? '—'} />
            <DataCardRow label="Valuation status" value={holding.valuation_status ?? '—'} />
            <DataCardRow label="Action hint" value={holding.portfolio_action_hint ?? '—'} />
            <DataCardRow label="Analysis date" value={formatDate(holding.latest_analysis_date)} />
            <DataCardRow
              label="Analysis fair value"
              value={
                holding.latest_analysis_fair_value_low != null ||
                holding.latest_analysis_fair_value_high != null
                  ? `${formatCurrency(holding.latest_analysis_fair_value_low)} – ${formatCurrency(holding.latest_analysis_fair_value_high)}`
                  : '—'
              }
            />
          </div>

          {holding.thesis ? (
            <div className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Thesis:
              </span>{' '}
              {holding.thesis}
            </div>
          ) : null}

          {holding.thesis_breakers ? (
            <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Breakers:
              </span>{' '}
              {holding.thesis_breakers}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}