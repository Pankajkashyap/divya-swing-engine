'use client'

import Link from 'next/link'
import type { StockAnalysis } from '@/app/investing/types'
import { DataCardRow } from '@/components/ui/DataCardRow'

type Props = {
  analyses: StockAnalysis[]
  onEdit: (analysis: StockAnalysis) => void
  onDelete: (analysis: StockAnalysis) => void
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

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(1)
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

function getVerdictTone(verdict: StockAnalysis['verdict']) {
  switch (verdict) {
    case 'Strong Buy':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'Buy':
      return 'text-blue-600 dark:text-blue-400'
    case 'Hold':
      return 'text-amber-600 dark:text-amber-400'
    case 'Avoid':
      return 'text-red-600 dark:text-red-400'
    case 'Red Flag':
      return 'text-red-700 dark:text-red-300'
    default:
      return 'text-neutral-500 dark:text-[#a8b2bf]'
  }
}

export function AnalysisCardList({
  analyses,
  onEdit,
  onDelete,
  deletingId = null,
}: Props) {
  if (analyses.length === 0) {
    return (
      <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        No analyses found.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {analyses.map((analysis) => (
        <div key={analysis.id} className="ui-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                <Link
                  href={`/investing/ticker/${encodeURIComponent(analysis.ticker)}`}
                  className="text-[#3346cc] underline-offset-2 hover:underline dark:text-[#9db2ff]"
                >
                  {analysis.ticker}
                </Link>
              </div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                {analysis.company}
              </div>
              <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                {analysis.sector} · {formatDate(analysis.analysis_date)}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className={`text-right text-xs font-medium ${getVerdictTone(analysis.verdict)}`}>
                {analysis.verdict ?? '—'}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(analysis)}
                  className="ui-btn-secondary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(analysis)}
                  className="ui-btn-secondary"
                  disabled={deletingId === analysis.id}
                >
                  {deletingId === analysis.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <DataCardRow label="Overall score" value={formatScore(analysis.overall_score)} />
            <DataCardRow label="Confidence" value={analysis.confidence ?? '—'} />
            <DataCardRow
              label="Fair value"
              value={
                analysis.fair_value_low != null || analysis.fair_value_high != null
                  ? `${formatCurrency(analysis.fair_value_low)} – ${formatCurrency(analysis.fair_value_high)}`
                  : '—'
              }
            />
            <DataCardRow label="Moat score" value={formatScore(analysis.moat_score)} />
            <DataCardRow label="Valuation score" value={formatScore(analysis.valuation_score ?? analysis.valuation_score_auto)}/>
            <DataCardRow
              label="ROIC score"
              value={formatScore(analysis.roic_score ?? analysis.roic_score_auto)}
            />
            <DataCardRow
              label="Financial health score"
              value={formatScore(analysis.fin_health_score ?? analysis.fin_health_score_auto)}
            />
            <DataCardRow
              label="Business understanding score"
              value={formatScore(analysis.biz_understanding_score ?? analysis.biz_understanding_score_auto)}
            />
          </div>

          {analysis.thesis ? (
            <div className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Thesis:
              </span>{' '}
              {analysis.thesis}
            </div>
          ) : null}

          {analysis.thesis_breakers ? (
            <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Breakers:
              </span>{' '}
              {analysis.thesis_breakers}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}