'use client'

import { useState } from 'react'
import type { Confidence, Sector, StockAnalysis, Verdict } from '@/app/investing/types'
import { parseQualitativeImport } from '@/app/investing/lib/qualitative/parseQualitativeImport'
import { scoreQualitativeImport } from '@/app/investing/lib/qualitative/scoreQualitativeImport'

export type StockAnalysisFormPayload = {
  ticker: string
  company: string
  analysis_date: string
  sector: Sector
  moat_score: number | null
  valuation_score: number | null
  mgmt_score: number | null
  roic_score: number | null
  fin_health_score: number | null
  biz_understanding_score: number | null
  verdict: Verdict | null
  fair_value_low: number | null
  fair_value_high: number | null
  thesis: string | null
  thesis_breakers: string | null
  confidence: Confidence | null
  raw_analysis: string | null
  moat_json: Record<string, unknown> | null
  management_json: Record<string, unknown> | null
  moat_score_auto: number | null
  management_score_auto: number | null
  qualitative_confidence: string | null
  business_understanding_json: Record<string, unknown> | null
}

type Props = {
  initialAnalysis?: StockAnalysis | null
  onSubmit: (values: StockAnalysisFormPayload) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
  busy?: boolean
}


const verdictOptions: Verdict[] = ['Strong Buy', 'Buy', 'Hold', 'Avoid', 'Red Flag']
const confidenceOptions: Confidence[] = ['High', 'Medium', 'Low']

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(1)
}

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return `$${value.toFixed(0)}`
}

function formatText(value: string | null | undefined) {
  return value?.trim() ? value : '—'
}

function CardChoice({
  selected,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
          : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
      }`}
    >
      <div className="font-medium text-neutral-900 dark:text-[#e6eaf0]">{title}</div>
      <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">{subtitle}</div>
    </button>
  )
}

function SummaryChip({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-700">
      <span className="text-xs text-neutral-500 dark:text-[#a8b2bf]">{label}: </span>
      <span className="text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">{value}</span>
    </div>
  )
}

export function StockAnalysisForm({
  initialAnalysis,
  onSubmit,
  onCancel,
  submitLabel = 'Save Analysis',
  busy = false,
}: Props) {
  const baseAnalysisDate = initialAnalysis?.analysis_date || getTodayDateString()
  const baseSector = (initialAnalysis?.sector as Sector | undefined) || 'Technology'

  const [analysisDate] = useState(baseAnalysisDate)
  const [sector] = useState<Sector>(baseSector)
  const [thesis, setThesis] = useState(initialAnalysis?.thesis ?? '')
  const [thesisBreakers, setThesisBreakers] = useState(initialAnalysis?.thesis_breakers ?? '')
  const [bizUnderstanding, setBizUnderstanding] = useState<'high' | 'medium' | 'low' | null>(
    initialAnalysis?.biz_understanding_score != null
      ? initialAnalysis.biz_understanding_score >= 7
        ? 'high'
        : initialAnalysis.biz_understanding_score >= 5
          ? 'medium'
          : 'low'
      : null
  )
  const [verdictOverride, setVerdictOverride] = useState<Verdict | ''>('')
  const [confidenceOverride, setConfidenceOverride] = useState<Confidence | ''>('')

  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiCompleted, setAiCompleted] = useState(
    (initialAnalysis?.moat_score_auto ?? null) != null ||
      (initialAnalysis?.management_score_auto ?? null) != null
  )
  const [moatScoreAuto, setMoatScoreAuto] = useState<number | null>(
    initialAnalysis?.moat_score_auto ?? null
  )
  const [mgmtScoreAuto, setMgmtScoreAuto] = useState<number | null>(
    initialAnalysis?.management_score_auto ?? null
  )
  const [moatJson, setMoatJson] = useState<Record<string, unknown> | null>(
    initialAnalysis?.moat_json ?? null
  )
  const [mgmtJson, setMgmtJson] = useState<Record<string, unknown> | null>(
    initialAnalysis?.management_json ?? null
  )
  const [qualitativeConfidence, setQualitativeConfidence] = useState<string | null>(
    initialAnalysis?.qualitative_confidence ?? null
  )

  const [showEngineDetails, setShowEngineDetails] = useState(false)

  const engineVerdict = initialAnalysis?.verdict_auto ?? initialAnalysis?.verdict ?? null
  const engineConfidence =
    initialAnalysis?.confidence_auto ?? initialAnalysis?.confidence ?? null

  const effectiveValuationScore =
    initialAnalysis?.valuation_score ?? initialAnalysis?.valuation_score_auto ?? null
  const effectiveRoicScore =
    initialAnalysis?.roic_score ?? initialAnalysis?.roic_score_auto ?? null
  const effectiveFinHealthScore =
    initialAnalysis?.fin_health_score ?? initialAnalysis?.fin_health_score_auto ?? null
  const effectiveOverallScore = initialAnalysis?.overall_score ?? null


  async function handleRunAiAnalysis() {
    if (!initialAnalysis?.ticker) return

    setAiLoading(true)
    setAiError(null)

    try {
      const res = await fetch('/investing/api/qualitative-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: initialAnalysis.ticker,
          company: initialAnalysis.company,
          sector: initialAnalysis.sector,
          thesisNotes: thesis || null,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'AI analysis failed.')

      const parsed = parseQualitativeImport(JSON.stringify(json.data))
      const scored = scoreQualitativeImport(parsed)

      setMoatScoreAuto(scored.moatScoreAuto)
      setMgmtScoreAuto(scored.managementScoreAuto)
      setMoatJson((json.data?.moat as Record<string, unknown> | null) ?? null)
      setMgmtJson((json.data?.management as Record<string, unknown> | null) ?? null)
      setQualitativeConfidence((json.data?.confidence as string | null) ?? null)
      setAiCompleted(true)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI analysis failed.')
    } finally {
      setAiLoading(false)
    }
  }

  function handleSubmit() {
    if (!initialAnalysis) return

    const bizScore =
      bizUnderstanding === 'high'
        ? 8
        : bizUnderstanding === 'medium'
          ? 6
          : bizUnderstanding === 'low'
            ? 4
            : null

    const payload: StockAnalysisFormPayload = {
      ticker: initialAnalysis.ticker,
      company: initialAnalysis.company,
      analysis_date: analysisDate,
      sector,
      moat_score: null,
      valuation_score: initialAnalysis.valuation_score ?? null,
      mgmt_score: null,
      roic_score: initialAnalysis.roic_score ?? null,
      fin_health_score: initialAnalysis.fin_health_score ?? null,
      biz_understanding_score: bizScore,
      verdict: verdictOverride || initialAnalysis.verdict || null,
      fair_value_low: initialAnalysis.fair_value_low ?? null,
      fair_value_high: initialAnalysis.fair_value_high ?? null,
      thesis: thesis.trim() || null,
      thesis_breakers: thesisBreakers.trim() || null,
      confidence: confidenceOverride || initialAnalysis.confidence || null,
      raw_analysis: null,
      moat_json: moatJson,
      management_json: mgmtJson,
      moat_score_auto: moatScoreAuto,
      management_score_auto: mgmtScoreAuto,
      qualitative_confidence: qualitativeConfidence,
      business_understanding_json: null,
    }

    void onSubmit(payload)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-lg font-bold text-neutral-900 dark:text-[#e6eaf0]">
            {initialAnalysis?.ticker} · {initialAnalysis?.company}
          </div>
          <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">
            {sector} · {analysisDate}
          </div>
        </div>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="ui-btn-secondary">
            Close
          </button>
        ) : null}
      </div>

      <div className="ui-card p-4">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            Engine Analysis
          </div>
          <button
            type="button"
            onClick={() => setShowEngineDetails((prev) => !prev)}
            className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-[#a8b2bf]"
          >
            {showEngineDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <SummaryChip label="Verdict" value={formatText(engineVerdict)} />
          <SummaryChip
            label="Fair value"
            value={`${formatMoney(initialAnalysis?.fair_value_low)} – ${formatMoney(initialAnalysis?.fair_value_high)}`}
          />
          <SummaryChip
            label="Score"
            value={
              effectiveOverallScore != null ? `${effectiveOverallScore.toFixed(1)}/10` : '—'
            }
          />
        </div>

        {showEngineDetails ? (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-200 pt-3 text-xs dark:border-neutral-700">
            <div>Valuation: {formatScore(effectiveValuationScore)}/10</div>
            <div>ROIC: {formatScore(effectiveRoicScore)}/10</div>
            <div>Financial Health: {formatScore(effectiveFinHealthScore)}/10</div>
            <div>Confidence: {formatText(engineConfidence)}</div>
            <div className="col-span-2">
              Red flags: {formatText(initialAnalysis?.thesis_breakers)}
            </div>
          </div>
        ) : null}
      </div>

      <div className="ui-card p-4">
        <div className="mb-1 text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          AI Qualitative Analysis
        </div>
        <p className="mb-3 text-xs text-neutral-500 dark:text-[#a8b2bf]">
          Evaluates moat strength and management quality using AI.
        </p>

        {aiCompleted ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3 text-sm">
              <div>
                <span className="text-neutral-500 dark:text-[#a8b2bf]">Moat: </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {moatScoreAuto?.toFixed(1) ?? '—'}/10
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-[#a8b2bf]">Management: </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {mgmtScoreAuto?.toFixed(1) ?? '—'}/10
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-[#a8b2bf]">AI Confidence: </span>
                <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  {qualitativeConfidence ?? '—'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunAiAnalysis}
              disabled={aiLoading}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-[#a8b2bf]"
            >
              {aiLoading ? 'Re-analyzing...' : 'Re-run analysis'}
            </button>

            {aiError ? (
              <div className="text-xs text-red-500">{aiError}</div>
            ) : null}
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={handleRunAiAnalysis}
              disabled={aiLoading || !initialAnalysis?.ticker}
              className="ui-btn-primary"
            >
              {aiLoading ? 'Analyzing with AI...' : 'Run AI Analysis'}
            </button>

            {aiError ? (
              <div className="mt-2 text-xs text-red-500">{aiError}</div>
            ) : null}
          </div>
        )}
      </div>

      <div className="ui-card space-y-4 p-4">
        <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Your Assessment
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
            How well do you understand this business?
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <CardChoice
              selected={bizUnderstanding === 'high'}
              title="I know it well"
              subtitle="Use 8/10 business understanding"
              onClick={() => setBizUnderstanding('high')}
            />
            <CardChoice
              selected={bizUnderstanding === 'medium'}
              title="Reasonably well"
              subtitle="Use 6/10 business understanding"
              onClick={() => setBizUnderstanding('medium')}
            />
            <CardChoice
              selected={bizUnderstanding === 'low'}
              title="Still learning"
              subtitle="Use 4/10 business understanding"
              onClick={() => setBizUnderstanding('low')}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
            Investment Thesis
          </label>
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder="Why invest? What's the core reason this stock will compound? e.g., 'Costco's membership model creates sticky recurring revenue with 90%+ renewal rates...'"
            rows={3}
            className="ui-input w-full"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
            What would make you sell?
          </label>
          <textarea
            value={thesisBreakers}
            onChange={(e) => setThesisBreakers(e.target.value)}
            placeholder="e.g., 'Membership renewal drops below 85%. Margins compress 100bps+ for 2 quarters.'"
            rows={2}
            className="ui-input w-full"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
              Override engine verdict? <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <select
              value={verdictOverride}
              onChange={(e) => setVerdictOverride(e.target.value as Verdict | '')}
              className="ui-input max-w-xs"
            >
              <option value="">Accept engine verdict</option>
              {verdictOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
              Override confidence? <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <select
              value={confidenceOverride}
              onChange={(e) => setConfidenceOverride(e.target.value as Confidence | '')}
              className="ui-input max-w-xs"
            >
              <option value="">Accept engine confidence</option>
              {confidenceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="ui-btn-secondary">
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || !thesis.trim()}
          className="ui-btn-primary"
        >
          {busy ? 'Saving...' : submitLabel}
        </button>
      </div>
    </div>
  )
}