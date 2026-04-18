'use client'

import { useMemo, useState } from 'react'
import type {
  AccountType,
  Action,
  DecisionJournalEntry,
  EmotionalState,
  FrameworkSupported,
} from '@/app/investing/types'

type DecisionJournalFormValues = {
  entry_date: string
  ticker: string
  account: AccountType
  action: Action
  shares: string
  price: string
  portfolio_weight_after: string
  reasoning: string
  emotional_state: EmotionalState | ''
  scorecard_overall: string
  framework_supported: FrameworkSupported | ''
  three_month_review: string
  twelve_month_review: string
}

type DecisionJournalFormPayload = {
  entry_date: string
  ticker: string
  account: AccountType
  action: Action
  shares: number | null
  price: number | null
  portfolio_weight_after: number | null
  reasoning: string | null
  emotional_state: EmotionalState | null
  scorecard_overall: number | null
  framework_supported: FrameworkSupported | null
  three_month_review: string | null
  twelve_month_review: string | null
}

type Props = {
  initialEntry?: DecisionJournalEntry | null
  onSubmit: (values: DecisionJournalFormPayload) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
  busy?: boolean
}

const accountOptions: AccountType[] = ['TFSA', 'Non-registered']
const actionOptions: Action[] = ['BUY', 'SELL', 'ADD', 'TRIM', 'HOLD']
const emotionalStateOptions: EmotionalState[] = [
  'Calm & analytical',
  'Excited',
  'Fearful',
  'Impatient',
  'Pressured',
  'Confident',
]
const frameworkSupportedOptions: FrameworkSupported[] = [
  'Yes',
  'Partially',
  'No — override',
]

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function toFormValues(entry?: DecisionJournalEntry | null): DecisionJournalFormValues {
  return {
    entry_date: entry?.entry_date ?? getTodayDateString(),
    ticker: entry?.ticker ?? '',
    account: entry?.account ?? 'TFSA',
    action: entry?.action ?? 'BUY',
    shares: entry?.shares != null ? String(entry.shares) : '',
    price: entry?.price != null ? String(entry.price) : '',
    portfolio_weight_after:
      entry?.portfolio_weight_after != null ? String(entry.portfolio_weight_after) : '',
    reasoning: entry?.reasoning ?? '',
    emotional_state: entry?.emotional_state ?? '',
    scorecard_overall:
      entry?.scorecard_overall != null ? String(entry.scorecard_overall) : '',
    framework_supported: entry?.framework_supported ?? '',
    three_month_review: entry?.three_month_review ?? '',
    twelve_month_review: entry?.twelve_month_review ?? '',
  }
}

export function DecisionJournalForm({
  initialEntry,
  onSubmit,
  onCancel,
  submitLabel = 'Save journal entry',
  busy = false,
}: Props) {
  const initialValues = useMemo(() => toFormValues(initialEntry), [initialEntry])
  const [values, setValues] = useState<DecisionJournalFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof DecisionJournalFormValues>(
    key: K,
    value: DecisionJournalFormValues[K]
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

    const ticker = values.ticker.trim().toUpperCase()
    const shares = parseNullableNumber(values.shares)
    const price = parseNullableNumber(values.price)
    const portfolioWeightAfter = parseNullableNumber(values.portfolio_weight_after)
    const scorecardOverall = parseNullableNumber(values.scorecard_overall)

    if (!values.entry_date) {
      setError('Entry date is required.')
      return
    }

    if (!ticker) {
      setError('Ticker is required.')
      return
    }

    if (shares != null && (!Number.isFinite(shares) || shares < 0)) {
      setError('Shares must be 0 or greater.')
      return
    }

    if (price != null && (!Number.isFinite(price) || price < 0)) {
      setError('Price must be 0 or greater.')
      return
    }

    if (
      portfolioWeightAfter != null &&
      (!Number.isFinite(portfolioWeightAfter) || portfolioWeightAfter < 0)
    ) {
      setError('Portfolio weight after must be 0 or greater.')
      return
    }

    if (
      scorecardOverall != null &&
      (!Number.isFinite(scorecardOverall) || scorecardOverall < 0 || scorecardOverall > 10)
    ) {
      setError('Scorecard overall must be between 0 and 10.')
      return
    }

    await onSubmit({
      entry_date: values.entry_date,
      ticker,
      account: values.account,
      action: values.action,
      shares,
      price,
      portfolio_weight_after: portfolioWeightAfter,
      reasoning: values.reasoning.trim() || null,
      emotional_state: values.emotional_state || null,
      scorecard_overall: scorecardOverall,
      framework_supported: values.framework_supported || null,
      three_month_review: values.three_month_review.trim() || null,
      twelve_month_review: values.twelve_month_review.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Entry date
          </span>
          <input
            type="date"
            value={values.entry_date}
            onChange={(e) => update('entry_date', e.target.value)}
            className="ui-input"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Ticker
          </span>
          <input
            value={values.ticker}
            onChange={(e) => update('ticker', e.target.value)}
            className="ui-input"
            placeholder="AMZN"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Account
          </span>
          <select
            value={values.account}
            onChange={(e) => update('account', e.target.value as AccountType)}
            className="ui-select"
          >
            {accountOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Action
          </span>
          <select
            value={values.action}
            onChange={(e) => update('action', e.target.value as Action)}
            className="ui-select"
          >
            {actionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Shares
          </span>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={values.shares}
            onChange={(e) => update('shares', e.target.value)}
            className="ui-input"
            placeholder="10"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Price
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.price}
            onChange={(e) => update('price', e.target.value)}
            className="ui-input"
            placeholder="182.50"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Portfolio weight after (%)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.portfolio_weight_after}
            onChange={(e) => update('portfolio_weight_after', e.target.value)}
            className="ui-input"
            placeholder="6.5"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Scorecard overall
          </span>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={values.scorecard_overall}
            onChange={(e) => update('scorecard_overall', e.target.value)}
            className="ui-input"
            placeholder="8.4"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Emotional state
          </span>
          <select
            value={values.emotional_state}
            onChange={(e) => update('emotional_state', e.target.value as EmotionalState | '')}
            className="ui-select"
          >
            <option value="">Select emotional state</option>
            {emotionalStateOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Framework supported
          </span>
          <select
            value={values.framework_supported}
            onChange={(e) =>
              update('framework_supported', e.target.value as FrameworkSupported | '')
            }
            className="ui-select"
          >
            <option value="">Select framework status</option>
            {frameworkSupportedOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
          Reasoning
        </span>
        <textarea
          value={values.reasoning}
          onChange={(e) => update('reasoning', e.target.value)}
          className="ui-textarea min-h-28"
          placeholder="Why did you make this decision?"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
          Three-month review
        </span>
        <textarea
          value={values.three_month_review}
          onChange={(e) => update('three_month_review', e.target.value)}
          className="ui-textarea min-h-24"
          placeholder="Optional review notes after three months."
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
          Twelve-month review
        </span>
        <textarea
          value={values.twelve_month_review}
          onChange={(e) => update('twelve_month_review', e.target.value)}
          className="ui-textarea min-h-24"
          placeholder="Optional review notes after twelve months."
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