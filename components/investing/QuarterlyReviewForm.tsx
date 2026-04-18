'use client'

import { useMemo, useState } from 'react'
import type { CyclePhase, QuarterlyReview } from '@/app/investing/types'

type QuarterlyReviewFormValues = {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  review_date: string
  portfolio_value: string
  quarter_return: string
  ytd_return: string
  sp500_quarter: string
  sp500_ytd: string
  num_holdings: string
  cash_pct: string
  cycle_phase: CyclePhase | ''
  top_lesson: string
  action_items: string
  emotional_discipline: string
}

type QuarterlyReviewFormPayload = {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  review_date: string
  portfolio_value: number | null
  quarter_return: number | null
  ytd_return: number | null
  sp500_quarter: number | null
  sp500_ytd: number | null
  num_holdings: number | null
  cash_pct: number | null
  cycle_phase: CyclePhase | null
  top_lesson: string | null
  action_items: string | null
  emotional_discipline: number | null
}

type Props = {
  initialReview?: QuarterlyReview | null
  onSubmit: (values: QuarterlyReviewFormPayload) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
  busy?: boolean
}

const quarterOptions: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4']

const cyclePhaseOptions: CyclePhase[] = [
  'Early recovery',
  'Mid-cycle',
  'Late cycle',
  'Contraction',
  'Uncertain',
]

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function toFormValues(review?: QuarterlyReview | null): QuarterlyReviewFormValues {
  return {
    quarter: review?.quarter ?? 'Q1',
    review_date: review?.review_date ?? getTodayDateString(),
    portfolio_value: review?.portfolio_value != null ? String(review.portfolio_value) : '',
    quarter_return: review?.quarter_return != null ? String(review.quarter_return) : '',
    ytd_return: review?.ytd_return != null ? String(review.ytd_return) : '',
    sp500_quarter: review?.sp500_quarter != null ? String(review.sp500_quarter) : '',
    sp500_ytd: review?.sp500_ytd != null ? String(review.sp500_ytd) : '',
    num_holdings: review?.num_holdings != null ? String(review.num_holdings) : '',
    cash_pct: review?.cash_pct != null ? String(review.cash_pct) : '',
    cycle_phase: review?.cycle_phase ?? '',
    top_lesson: review?.top_lesson ?? '',
    action_items: review?.action_items ?? '',
    emotional_discipline:
      review?.emotional_discipline != null ? String(review.emotional_discipline) : '',
  }
}

export function QuarterlyReviewForm({
  initialReview,
  onSubmit,
  onCancel,
  submitLabel = 'Save review',
  busy = false,
}: Props) {
  const initialValues = useMemo(() => toFormValues(initialReview), [initialReview])
  const [values, setValues] = useState<QuarterlyReviewFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof QuarterlyReviewFormValues>(
    key: K,
    value: QuarterlyReviewFormValues[K]
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const portfolioValue = parseNullableNumber(values.portfolio_value)
    const quarterReturn = parseNullableNumber(values.quarter_return)
    const ytdReturn = parseNullableNumber(values.ytd_return)
    const sp500Quarter = parseNullableNumber(values.sp500_quarter)
    const sp500Ytd = parseNullableNumber(values.sp500_ytd)
    const numHoldings = parseNullableNumber(values.num_holdings)
    const cashPct = parseNullableNumber(values.cash_pct)
    const emotionalDiscipline = parseNullableNumber(values.emotional_discipline)

    if (!values.review_date) {
      setError('Review date is required.')
      return
    }

    if (portfolioValue != null && (!Number.isFinite(portfolioValue) || portfolioValue < 0)) {
      setError('Portfolio value must be 0 or greater.')
      return
    }

    if (quarterReturn != null && !Number.isFinite(quarterReturn)) {
      setError('Quarter return must be a valid number.')
      return
    }

    if (ytdReturn != null && !Number.isFinite(ytdReturn)) {
      setError('YTD return must be a valid number.')
      return
    }

    if (sp500Quarter != null && !Number.isFinite(sp500Quarter)) {
      setError('S&P quarter return must be a valid number.')
      return
    }

    if (sp500Ytd != null && !Number.isFinite(sp500Ytd)) {
      setError('S&P YTD return must be a valid number.')
      return
    }

    if (numHoldings != null && (!Number.isFinite(numHoldings) || numHoldings < 0)) {
      setError('Number of holdings must be 0 or greater.')
      return
    }

    if (cashPct != null && (!Number.isFinite(cashPct) || cashPct < 0 || cashPct > 100)) {
      setError('Cash % must be between 0 and 100.')
      return
    }

    if (
      emotionalDiscipline != null &&
      (!Number.isFinite(emotionalDiscipline) ||
        emotionalDiscipline < 1 ||
        emotionalDiscipline > 10)
    ) {
      setError('Emotional discipline must be between 1 and 10.')
      return
    }

    await onSubmit({
      quarter: values.quarter,
      review_date: values.review_date,
      portfolio_value: portfolioValue,
      quarter_return: quarterReturn,
      ytd_return: ytdReturn,
      sp500_quarter: sp500Quarter,
      sp500_ytd: sp500Ytd,
      num_holdings: numHoldings,
      cash_pct: cashPct,
      cycle_phase: values.cycle_phase || null,
      top_lesson: values.top_lesson.trim() || null,
      action_items: values.action_items.trim() || null,
      emotional_discipline: emotionalDiscipline,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Quarter
          </span>
          <select
            value={values.quarter}
            onChange={(e) => update('quarter', e.target.value as 'Q1' | 'Q2' | 'Q3' | 'Q4')}
            className="ui-select"
          >
            {quarterOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Review date
          </span>
          <input
            type="date"
            value={values.review_date}
            onChange={(e) => update('review_date', e.target.value)}
            className="ui-input"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Portfolio value
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.portfolio_value}
            onChange={(e) => update('portfolio_value', e.target.value)}
            className="ui-input"
            placeholder="125000"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Quarter return (%)
          </span>
          <input
            type="number"
            step="0.01"
            value={values.quarter_return}
            onChange={(e) => update('quarter_return', e.target.value)}
            className="ui-input"
            placeholder="8.5"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            YTD return (%)
          </span>
          <input
            type="number"
            step="0.01"
            value={values.ytd_return}
            onChange={(e) => update('ytd_return', e.target.value)}
            className="ui-input"
            placeholder="14.2"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            S&amp;P quarter (%)
          </span>
          <input
            type="number"
            step="0.01"
            value={values.sp500_quarter}
            onChange={(e) => update('sp500_quarter', e.target.value)}
            className="ui-input"
            placeholder="5.1"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            S&amp;P YTD (%)
          </span>
          <input
            type="number"
            step="0.01"
            value={values.sp500_ytd}
            onChange={(e) => update('sp500_ytd', e.target.value)}
            className="ui-input"
            placeholder="11.8"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Number of holdings
          </span>
          <input
            type="number"
            step="1"
            min="0"
            value={values.num_holdings}
            onChange={(e) => update('num_holdings', e.target.value)}
            className="ui-input"
            placeholder="12"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Cash (%)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={values.cash_pct}
            onChange={(e) => update('cash_pct', e.target.value)}
            className="ui-input"
            placeholder="7.5"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Emotional discipline (1–10)
          </span>
          <input
            type="number"
            step="1"
            min="1"
            max="10"
            value={values.emotional_discipline}
            onChange={(e) => update('emotional_discipline', e.target.value)}
            className="ui-input"
            placeholder="8"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Cycle phase
          </span>
          <select
            value={values.cycle_phase}
            onChange={(e) => update('cycle_phase', e.target.value as CyclePhase | '')}
            className="ui-select"
          >
            <option value="">Select cycle phase</option>
            {cyclePhaseOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
          Top lesson
        </span>
        <textarea
          value={values.top_lesson}
          onChange={(e) => update('top_lesson', e.target.value)}
          className="ui-textarea min-h-24"
          placeholder="What was the biggest lesson this quarter?"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
          Action items
        </span>
        <textarea
          value={values.action_items}
          onChange={(e) => update('action_items', e.target.value)}
          className="ui-textarea min-h-24"
          placeholder="What actions should you take next quarter?"
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