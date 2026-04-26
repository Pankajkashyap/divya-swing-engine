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

function shouldShowAutoNote(value: string | null | undefined) {
  if (!value) return false

  const normalized = value.toLowerCase()
  return !normalized.includes('could not be calculated')
}

function getSourceBadgeClass(source: 'Manual' | 'Auto') {
  return source === 'Manual'
    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
}

function SourceBadge({ source }: { source: 'Manual' | 'Auto' | null }) {
  if (!source) return null

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getSourceBadgeClass(source)}`}
    >
      {source}
    </span>
  )
}

function getManualOrAutoSource(args: {
  manualValue: unknown
  autoValue: unknown
}): 'Manual' | 'Auto' | null {
  const { manualValue, autoValue } = args
  if (manualValue != null) return 'Manual'
  if (autoValue != null) return 'Auto'
  return null
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
      {analyses.map((analysis) => {
        const verdictSource = getManualOrAutoSource({
          manualValue: analysis.verdict,
          autoValue: analysis.verdict_auto,
        })
        const confidenceSource = getManualOrAutoSource({
          manualValue: analysis.confidence,
          autoValue: analysis.confidence_auto,
        })
        const valuationSource = getManualOrAutoSource({
          manualValue: analysis.valuation_score,
          autoValue: analysis.valuation_score_auto,
        })
        const roicSource = getManualOrAutoSource({
          manualValue: analysis.roic_score,
          autoValue: analysis.roic_score_auto,
        })
        const finHealthSource = getManualOrAutoSource({
          manualValue: analysis.fin_health_score,
          autoValue: analysis.fin_health_score_auto,
        })
        const bizSource = getManualOrAutoSource({
          manualValue: analysis.biz_understanding_score,
          autoValue: analysis.biz_understanding_score_auto,
        })

        return (
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
                  {analysis.verdict ?? analysis.verdict_auto ?? '—'}
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

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="text-xs text-neutral-500 dark:text-[#a8b2bf]">Sources:</div>
              <div className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-[#a8b2bf]">
                Verdict <SourceBadge source={verdictSource} />
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-[#a8b2bf]">
                Confidence <SourceBadge source={confidenceSource} />
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-[#a8b2bf]">
                Valuation <SourceBadge source={valuationSource} />
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-[#a8b2bf]">
                ROIC <SourceBadge source={roicSource} />
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-[#a8b2bf]">
                Financial Health <SourceBadge source={finHealthSource} />
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-[#a8b2bf]">
                Business Understanding <SourceBadge source={bizSource} />
              </div>
            </div>

            <div className="mt-4 grid gap-x-6 gap-y-2 md:grid-cols-2">
              <DataCardRow label="Overall score" value={formatScore(analysis.overall_score)} />
              <DataCardRow
                label="Confidence"
                value={analysis.confidence ?? analysis.confidence_auto ?? '—'}
              />

              <DataCardRow
                label="Fair value"
                value={
                  analysis.fair_value_low != null || analysis.fair_value_high != null
                    ? `${formatCurrency(analysis.fair_value_low)} – ${formatCurrency(analysis.fair_value_high)}`
                    : '—'
                }
              />
              <DataCardRow label="Moat score" value={formatScore(analysis.moat_score)} />

              <DataCardRow
                label="Valuation score"
                value={formatScore(analysis.valuation_score ?? analysis.valuation_score_auto)}
              />
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
                value={formatScore(
                  analysis.biz_understanding_score ?? analysis.biz_understanding_score_auto
                )}
              />
            </div>

            {shouldShowAutoNote(analysis.valuation_score_explanation) ||
            shouldShowAutoNote(analysis.roic_score_explanation) ||
            shouldShowAutoNote(analysis.fin_health_score_explanation) ||
            shouldShowAutoNote(analysis.biz_understanding_score_explanation) ||
            shouldShowAutoNote(analysis.confidence_explanation) ||
            shouldShowAutoNote(analysis.verdict_explanation) ? (
              <div className="mt-4 space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Auto-score notes
                </div>

                {shouldShowAutoNote(analysis.valuation_score_explanation) ? (
                  <div className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                    <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                      Valuation:
                    </span>{' '}
                    {analysis.valuation_score_explanation}
                  </div>
                ) : null}

                {shouldShowAutoNote(analysis.roic_score_explanation) ? (
                  <div className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                    <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                      ROIC:
                    </span>{' '}
                    {analysis.roic_score_explanation}
                  </div>
                ) : null}

                {shouldShowAutoNote(analysis.fin_health_score_explanation) ? (
                  <div className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                    <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                      Financial health:
                    </span>{' '}
                    {analysis.fin_health_score_explanation}
                  </div>
                ) : null}

                {shouldShowAutoNote(analysis.biz_understanding_score_explanation) ? (
                  <div className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                    <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                      Business understanding:
                    </span>{' '}
                    {analysis.biz_understanding_score_explanation}
                  </div>
                ) : null}

                {shouldShowAutoNote(analysis.confidence_explanation) ? (
                  <div className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                    <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                      Confidence:
                    </span>{' '}
                    {analysis.confidence_explanation}
                  </div>
                ) : null}

                {shouldShowAutoNote(analysis.verdict_explanation) ? (
                  <div className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                    <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                      Verdict:
                    </span>{' '}
                    {analysis.verdict_explanation}
                  </div>
                ) : null}
              </div>
            ) : null}

            {analysis.thesis ? (
              <div className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">Thesis:</span>{' '}
                {analysis.thesis}
              </div>
            ) : null}

            {analysis.thesis_breakers ? (
              <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">Breakers:</span>{' '}
                {analysis.thesis_breakers}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}