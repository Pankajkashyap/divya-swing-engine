'use client'

import { useMemo, useState } from 'react'
import type { Confidence, Sector, StockAnalysis, Verdict } from '@/app/investing/types'
import { buildMoatManagementPrompt } from '@/app/investing/lib/qualitative/buildMoatManagementPrompt'
import { parseQualitativeImport } from '@/app/investing/lib/qualitative/parseQualitativeImport'
import { scoreQualitativeImport } from '@/app/investing/lib/qualitative/scoreQualitativeImport'

type StockAnalysisFormValues = {
  ticker: string
  company: string
  analysis_date: string
  sector: Sector | ''
  moat_score: string
  valuation_score: string
  mgmt_score: string
  roic_score: string
  fin_health_score: string
  biz_understanding_score: string
  verdict: Verdict | ''
  fair_value_low: string
  fair_value_high: string
  thesis: string
  thesis_breakers: string
  confidence: Confidence | ''
  raw_analysis: string
}

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

const sectorOptions: Sector[] = [
  'Technology',
  'Consumer Staples',
  'Consumer Discretionary',
  'Healthcare',
  'Financials',
  'Industrials',
  'Energy',
  'Communication Services',
  'Real Estate',
  'Utilities',
  'Materials',
]

const verdictOptions: Verdict[] = ['Strong Buy', 'Buy', 'Hold', 'Avoid', 'Red Flag']
const confidenceOptions: Confidence[] = ['High', 'Medium', 'Low']

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function toFormValues(item?: StockAnalysis | null): StockAnalysisFormValues {
  return {
    ticker: item?.ticker ?? '',
    company: item?.company ?? '',
    analysis_date: item?.analysis_date ?? getTodayDateString(),
    sector: (item?.sector as Sector | undefined) ?? '',
    moat_score: item?.moat_score != null ? String(item.moat_score) : '',
    valuation_score: item?.valuation_score != null ? String(item.valuation_score) : '',
    mgmt_score: item?.mgmt_score != null ? String(item.mgmt_score) : '',
    roic_score: item?.roic_score != null ? String(item.roic_score) : '',
    fin_health_score: item?.fin_health_score != null ? String(item.fin_health_score) : '',
    biz_understanding_score:
      item?.biz_understanding_score != null ? String(item.biz_understanding_score) : '',
    verdict: item?.verdict ?? '',
    fair_value_low: item?.fair_value_low != null ? String(item.fair_value_low) : '',
    fair_value_high: item?.fair_value_high != null ? String(item.fair_value_high) : '',
    thesis: item?.thesis ?? '',
    thesis_breakers: item?.thesis_breakers ?? '',
    confidence: item?.confidence ?? '',
    raw_analysis: item?.raw_analysis ?? '',
  }
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-4">
      <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">{title}</div>
      {subtitle ? (
        <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">{subtitle}</div>
      ) : null}
    </div>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-xs text-neutral-500 dark:text-[#a8b2bf]">{children}</span>
}

export function StockAnalysisForm({
  initialAnalysis,
  onSubmit,
  onCancel,
  submitLabel = 'Save analysis',
  busy = false,
}: Props) {
  const initialValues = useMemo(() => toFormValues(initialAnalysis), [initialAnalysis])
  const [values, setValues] = useState<StockAnalysisFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)
  const [promptText, setPromptText] = useState('')
  const [qualitativeJsonText, setQualitativeJsonText] = useState(
    initialAnalysis?.raw_analysis ?? ''
  )
  const [qualitativeImportSuccess, setQualitativeImportSuccess] = useState<string | null>(null)
  const [, setMoatJson] = useState<Record<string, unknown> | null>(initialAnalysis?.moat_json ?? null)
  const [, setManagementJson] = useState<Record<string, unknown> | null>(
    initialAnalysis?.management_json ?? null
  )
  const [moatScoreAuto, setMoatScoreAuto] = useState<number | null>(
    initialAnalysis?.moat_score_auto ?? null
  )
  const [managementScoreAuto, setManagementScoreAuto] = useState<number | null>(
    initialAnalysis?.management_score_auto ?? null
  )
  const [qualitativeConfidence, setQualitativeConfidence] = useState<string | null>(
    initialAnalysis?.qualitative_confidence ?? null
  )

  function update<K extends keyof StockAnalysisFormValues>(
    key: K,
    value: StockAnalysisFormValues[K]
  ) {
    setError(null)
    setQualitativeImportSuccess(null)
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleReset() {
    setValues(initialValues)
    setPromptText('')
    setQualitativeJsonText(initialAnalysis?.raw_analysis ?? '')
    setMoatJson(initialAnalysis?.moat_json ?? null)
    setManagementJson(initialAnalysis?.management_json ?? null)
    setMoatScoreAuto(initialAnalysis?.moat_score_auto ?? null)
    setManagementScoreAuto(initialAnalysis?.management_score_auto ?? null)
    setQualitativeConfidence(initialAnalysis?.qualitative_confidence ?? null)
    setError(null)
    setQualitativeImportSuccess(null)
  }

  function parseNullableNumber(value: string) {
    if (value.trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  }

  function validateScore(name: string, value: number | null) {
    if (value == null) return null
    if (!Number.isFinite(value) || value < 0 || value > 10) {
      return `${name} must be between 0 and 10.`
    }
    return null
  }

  function handleGeneratePrompt() {
    const ticker = values.ticker.trim().toUpperCase()
    const company = values.company.trim()
    const sector = values.sector
    const thesisNotes = values.thesis.trim() || null

    if (!ticker) {
      setError('Enter a ticker before generating the prompt.')
      return
    }

    if (!company) {
      setError('Enter a company before generating the prompt.')
      return
    }

    const prompt = buildMoatManagementPrompt({
      ticker,
      company,
      sector: sector || null,
      thesisNotes,
    })

    setPromptText(prompt)
    setError(null)
    setQualitativeImportSuccess('Prompt generated.')
  }

  async function handleCopyPrompt() {
    if (!promptText) return

    try {
      await navigator.clipboard.writeText(promptText)
      setQualitativeImportSuccess('Prompt copied to clipboard.')
    } catch {
      setQualitativeImportSuccess('Prompt generated. Copy manually if needed.')
    }
  }

  function handleImportQualitativeJson() {
    try {
      const parsed = parseQualitativeImport(qualitativeJsonText)
      const scored = scoreQualitativeImport(parsed)

      setMoatJson(parsed.moat as unknown as Record<string, unknown>)
      setManagementJson(parsed.management as unknown as Record<string, unknown>)
      setMoatScoreAuto(scored.moatScoreAuto)
      setManagementScoreAuto(scored.managementScoreAuto)
      setQualitativeConfidence(parsed.confidence)

      setValues((prev) => ({
        ...prev,
        moat_score: String(scored.moatScoreAuto),
        mgmt_score: String(scored.managementScoreAuto),
        raw_analysis: qualitativeJsonText,
      }))

      setError(null)
      setQualitativeImportSuccess(
        `Imported qualitative analysis. Moat ${scored.moatScoreAuto.toFixed(1)}/10, Management ${scored.managementScoreAuto.toFixed(1)}/10.`
      )
    } catch (err) {
      setQualitativeImportSuccess(null)
      setError(err instanceof Error ? err.message : 'Failed to import qualitative JSON.')
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const ticker = values.ticker.trim().toUpperCase()
    const company = values.company.trim()
    const sector = values.sector

    const moatScore = parseNullableNumber(values.moat_score)
    const valuationScore = parseNullableNumber(values.valuation_score)
    const mgmtScore = parseNullableNumber(values.mgmt_score)
    const roicScore = parseNullableNumber(values.roic_score)
    const finHealthScore = parseNullableNumber(values.fin_health_score)
    const bizUnderstandingScore = parseNullableNumber(values.biz_understanding_score)

    const fairValueLow = parseNullableNumber(values.fair_value_low)
    const fairValueHigh = parseNullableNumber(values.fair_value_high)

    if (!ticker) {
      setError('Ticker is required.')
      return
    }

    if (!company) {
      setError('Company is required.')
      return
    }

    if (!values.analysis_date) {
      setError('Analysis date is required.')
      return
    }

    if (!sector) {
      setError('Sector is required.')
      return
    }

    const scoreErrors = [
      validateScore('Moat score', moatScore),
      validateScore('Valuation score', valuationScore),
      validateScore('Management score', mgmtScore),
      validateScore('ROIC score', roicScore),
      validateScore('Financial health score', finHealthScore),
      validateScore('Business understanding score', bizUnderstandingScore),
    ].filter(Boolean)

    if (scoreErrors.length > 0) {
      setError(scoreErrors[0] ?? 'Invalid score.')
      return
    }

    if (fairValueLow != null && (!Number.isFinite(fairValueLow) || fairValueLow < 0)) {
      setError('Fair value low must be 0 or greater.')
      return
    }

    if (fairValueHigh != null && (!Number.isFinite(fairValueHigh) || fairValueHigh < 0)) {
      setError('Fair value high must be 0 or greater.')
      return
    }

    if (fairValueLow != null && fairValueHigh != null && fairValueLow > fairValueHigh) {
      setError('Fair value low cannot be greater than fair value high.')
      return
    }

    let businessUnderstandingJson: Record<string, unknown> | null = null

    if (values.raw_analysis.trim()) {
      try {
        const parsed = JSON.parse(values.raw_analysis)
        if (parsed && typeof parsed === 'object') {
          businessUnderstandingJson = parsed as Record<string, unknown>
        }
      } catch {
        businessUnderstandingJson = null
      }
    }

    await onSubmit({
      ticker,
      company,
      analysis_date: values.analysis_date,
      sector,
      moat_score: moatScore,
      valuation_score: valuationScore,
      mgmt_score: mgmtScore,
      roic_score: roicScore,
      fin_health_score: finHealthScore,
      biz_understanding_score: bizUnderstandingScore,
      verdict: values.verdict || null,
      fair_value_low: fairValueLow,
      fair_value_high: fairValueHigh,
      thesis: values.thesis.trim() || null,
      thesis_breakers: values.thesis_breakers.trim() || null,
      confidence: values.confidence || null,
      raw_analysis: values.raw_analysis.trim() || null,
      moat_json: null,
      management_json: null,
      moat_score_auto: null,
      management_score_auto: null,
      qualitative_confidence: null,
      business_understanding_json: businessUnderstandingJson,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <SectionHeader
          title="Core analysis details"
          subtitle="Basic company information, fair value range, verdict, and thesis notes."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Ticker
            </span>
            <input
              value={values.ticker}
              onChange={(e) => update('ticker', e.target.value)}
              className="ui-input"
              placeholder="META"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Company
            </span>
            <input
              value={values.company}
              onChange={(e) => update('company', e.target.value)}
              className="ui-input"
              placeholder="Meta Platforms"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Analysis date
            </span>
            <input
              type="date"
              value={values.analysis_date}
              onChange={(e) => update('analysis_date', e.target.value)}
              className="ui-input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Sector
            </span>
            <select
              value={values.sector}
              onChange={(e) => update('sector', e.target.value as Sector | '')}
              className="ui-select"
            >
              <option value="">Select sector</option>
              {sectorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Verdict
            </span>
            <select
              value={values.verdict}
              onChange={(e) => update('verdict', e.target.value as Verdict | '')}
              className="ui-select"
            >
              <option value="">Select verdict</option>
              {verdictOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Confidence
            </span>
            <FieldHint>Leave blank to use the auto confidence level when available.</FieldHint>
            <select
              value={values.confidence}
              onChange={(e) => update('confidence', e.target.value as Confidence | '')}
              className="ui-select"
            >
              <option value="">Select confidence</option>
              {confidenceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Fair value low
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={values.fair_value_low}
              onChange={(e) => update('fair_value_low', e.target.value)}
              className="ui-input"
              placeholder="420.00"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Fair value high
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={values.fair_value_high}
              onChange={(e) => update('fair_value_high', e.target.value)}
              className="ui-input"
              placeholder="510.00"
            />
          </label>
        </div>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Thesis
            </span>
            <textarea
              value={values.thesis}
              onChange={(e) => update('thesis', e.target.value)}
              className="ui-textarea min-h-28"
              placeholder="Summarize the investment thesis."
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Thesis breakers
            </span>
            <textarea
              value={values.thesis_breakers}
              onChange={(e) => update('thesis_breakers', e.target.value)}
              className="ui-textarea min-h-24"
              placeholder="What would invalidate the thesis?"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <SectionHeader
          title="Scores"
          subtitle="Enter manual values if you want to override the app. Otherwise leave auto-capable fields blank."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Moat score
            </span>
            <FieldHint>Usually imported from qualitative analysis.</FieldHint>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={values.moat_score}
              onChange={(e) => update('moat_score', e.target.value)}
              className="ui-input"
              placeholder="8.5"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Valuation score
            </span>
            <FieldHint>Leave blank to use the auto valuation score when available.</FieldHint>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={values.valuation_score}
              onChange={(e) => update('valuation_score', e.target.value)}
              className="ui-input"
              placeholder="7.0"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Management score
            </span>
            <FieldHint>Usually imported from qualitative analysis.</FieldHint>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={values.mgmt_score}
              onChange={(e) => update('mgmt_score', e.target.value)}
              className="ui-input"
              placeholder="8.0"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              ROIC score
            </span>
            <FieldHint>Leave blank to use the auto ROIC score when available.</FieldHint>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={values.roic_score}
              onChange={(e) => update('roic_score', e.target.value)}
              className="ui-input"
              placeholder="9.0"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Financial health score
            </span>
            <FieldHint>Leave blank to use the auto financial health score when available.</FieldHint>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={values.fin_health_score}
              onChange={(e) => update('fin_health_score', e.target.value)}
              className="ui-input"
              placeholder="8.0"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Business understanding score
            </span>
            <FieldHint>
              Leave blank to use the auto business understanding score when available.
            </FieldHint>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={values.biz_understanding_score}
              onChange={(e) => update('biz_understanding_score', e.target.value)}
              className="ui-input"
              placeholder="7.5"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <SectionHeader
          title="Qualitative import"
          subtitle="Generate a prompt, run it in ChatGPT, then paste the JSON back here."
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGeneratePrompt}
            className="ui-btn-secondary"
            disabled={busy}
          >
            Generate Moat/Management Prompt
          </button>

          {promptText ? (
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="ui-btn-secondary"
              disabled={busy}
            >
              Copy Prompt
            </button>
          ) : null}
        </div>

        {promptText ? (
          <div className="mt-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Generated prompt
              </span>
              <textarea value={promptText} readOnly className="ui-textarea min-h-40" />
            </label>
          </div>
        ) : null}

        <div className="mt-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Paste ChatGPT JSON
            </span>
            <textarea
              value={qualitativeJsonText}
              onChange={(e) => {
                setQualitativeJsonText(e.target.value)
                setError(null)
                setQualitativeImportSuccess(null)
              }}
              className="ui-textarea min-h-40"
              placeholder='Paste JSON like { "moat": { ... }, "management": { ... }, "confidence": "High" }'
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleImportQualitativeJson}
            className="ui-btn-secondary"
            disabled={busy}
          >
            Import Qualitative Analysis
          </button>

          {moatScoreAuto != null || managementScoreAuto != null ? (
            <div className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
              Imported scores: Moat {moatScoreAuto?.toFixed(1) ?? '--'} / 10 · Management{' '}
              {managementScoreAuto?.toFixed(1) ?? '--'} / 10
              {qualitativeConfidence ? ` · Confidence ${qualitativeConfidence}` : ''}
            </div>
          ) : null}
        </div>

        {qualitativeImportSuccess ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {qualitativeImportSuccess}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <SectionHeader
          title="Raw notes / JSON"
          subtitle="Paste full research notes or business understanding JSON here when needed."
        />

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Raw analysis
          </span>
          <textarea
            value={values.raw_analysis}
            onChange={(e) => update('raw_analysis', e.target.value)}
            className="ui-textarea min-h-40"
            placeholder="Paste the full research output, notes, or business understanding JSON."
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-[#f0a3a3]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="ui-btn-secondary" disabled={busy}>
            Cancel
          </button>
        ) : null}

        <button type="button" onClick={handleReset} className="ui-btn-secondary" disabled={busy}>
          Reset
        </button>

        <button type="submit" className="ui-btn-primary" disabled={busy}>
          {busy ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}