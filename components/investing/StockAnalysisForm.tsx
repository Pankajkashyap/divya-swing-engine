'use client'

import { useMemo, useState } from 'react'
import type { Confidence, Sector, StockAnalysis, Verdict } from '@/app/investing/types'

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

type StockAnalysisFormPayload = {
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

const verdictOptions: Verdict[] = [
  'Strong Buy',
  'Buy',
  'Hold',
  'Avoid',
  'Red Flag',
]

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

  function update<K extends keyof StockAnalysisFormValues>(
    key: K,
    value: StockAnalysisFormValues[K]
  ) {
    setError(null)
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleReset() {
    setValues(initialValues)
    setError(null)
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

    if (
      fairValueLow != null &&
      fairValueHigh != null &&
      fairValueLow > fairValueHigh
    ) {
      setError('Fair value low cannot be greater than fair value high.')
      return
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
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            Moat score
          </span>
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

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
          Raw analysis
        </span>
        <textarea
          value={values.raw_analysis}
          onChange={(e) => update('raw_analysis', e.target.value)}
          className="ui-textarea min-h-40"
          placeholder="Paste the full research output or notes."
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-[#f0a3a3]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="ui-btn-secondary"
            disabled={busy}
          >
            Cancel
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleReset}
          className="ui-btn-secondary"
          disabled={busy}
        >
          Reset
        </button>

        <button type="submit" className="ui-btn-primary" disabled={busy}>
          {busy ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}