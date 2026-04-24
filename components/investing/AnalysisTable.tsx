'use client'

import Link from 'next/link'
import type { StockAnalysis } from '@/app/investing/types'

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

export function AnalysisTable({
  analyses,
  onEdit,
  onDelete,
  deletingId = null,
}: Props) {
  if (analyses.length === 0) {
    return (
      <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        No matching analyses found.
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
            <th>Date</th>
            <th>Sector</th>
            <th>Verdict</th>
            <th>Overall</th>
            <th>Confidence</th>
            <th>Fair Value Low</th>
            <th>Fair Value High</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {analyses.map((analysis) => (
            <tr key={analysis.id}>
              <td className="font-medium">
                <Link
                  href={`/investing/ticker/${encodeURIComponent(analysis.ticker)}`}
                  className="text-[#3346cc] underline-offset-2 hover:underline dark:text-[#9db2ff]"
                >
                  {analysis.ticker}
                </Link>
              </td>
              <td>{analysis.company}</td>
              <td>{formatDate(analysis.analysis_date)}</td>
              <td>{analysis.sector}</td>
              <td>{analysis.verdict ?? analysis.verdict_auto ?? '—'}</td>
              <td>{formatScore(analysis.overall_score)}</td>
              <td>{analysis.confidence ?? analysis.confidence_auto ?? '—'}</td>
              <td>{formatCurrency(analysis.fair_value_low)}</td>
              <td>{formatCurrency(analysis.fair_value_high)}</td>
              <td>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}