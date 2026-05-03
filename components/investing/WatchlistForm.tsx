'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Sector, WatchlistItem, WatchlistStatus } from '@/app/investing/types'

type WatchlistFormValues = {
  ticker: string
  company: string
  sector: Sector | ''
  why_watching: string
  target_entry: string
  current_price: string
  fair_value_low: string
  fair_value_high: string
  scorecard_overall: string
  status: WatchlistStatus
  date_added: string
}

type WatchlistFormPayload = {
  ticker: string
  company: string
  sector: Sector
  why_watching: string | null
  target_entry: number | null
  current_price: number
  fair_value_low: number | null
  fair_value_high: number | null
  scorecard_overall: number | null
  status: WatchlistStatus
  date_added: string
}

type Props = {
  initialItem?: WatchlistItem | null
  onSubmit: (values: WatchlistFormPayload) => Promise<void> | void
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

const statusOptions: WatchlistStatus[] = [
  'Watching — overvalued',
  'Watching — approaching entry',
  'Ready to buy',
  'Under research',
  'Removed',
]

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function toFormValues(item?: WatchlistItem | null): WatchlistFormValues {
  return {
    ticker: item?.ticker ?? '',
    company: item?.company ?? '',
    sector: (item?.sector as Sector | undefined) ?? '',
    why_watching: item?.why_watching ?? '',
    target_entry: item?.target_entry != null ? String(item.target_entry) : '',
    current_price: item?.current_price != null && item.current_price > 0 ? String(item.current_price) : '',
    fair_value_low: item?.fair_value_low != null ? String(item.fair_value_low) : '',
    fair_value_high: item?.fair_value_high != null ? String(item.fair_value_high) : '',
    scorecard_overall:
      item?.scorecard_overall != null ? String(item.scorecard_overall) : '',
    status: item?.status ?? 'Under research',
    date_added: item?.date_added ?? getTodayDateString(),
  }
}

export function WatchlistForm({
  initialItem,
  onSubmit,
  onCancel,
  submitLabel = 'Save watchlist item',
  busy = false,
}: Props) {
  const initialValues = useMemo(() => toFormValues(initialItem), [initialItem])
  const [values, setValues] = useState<WatchlistFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (initialItem?.current_price != null && initialItem.current_price > 0) {
      setValues((prev) => ({ ...prev, current_price: String(initialItem.current_price) }))
    }
  }, [initialItem?.current_price])


  function update<K extends keyof WatchlistFormValues>(
    key: K,
    value: WatchlistFormValues[K]
  ) {
    setError(null)
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleReset() {
    setValues(initialValues)
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const ticker = values.ticker.trim().toUpperCase()
    const company = values.company.trim()
    const sector = values.sector
    const whyWatching = values.why_watching.trim()

    const targetEntry =
      values.target_entry.trim() === '' ? null : Number(values.target_entry)
    const currentPrice = Number(values.current_price)
    const fairValueLow =
      values.fair_value_low.trim() === '' ? null : Number(values.fair_value_low)
    const fairValueHigh =
      values.fair_value_high.trim() === '' ? null : Number(values.fair_value_high)
    const scorecardOverall =
      values.scorecard_overall.trim() === '' ? null : Number(values.scorecard_overall)

    if (!ticker) {
      setError('Ticker is required.')
      return
    }

    if (!company) {
      setError('Company is required.')
      return
    }

    if (!sector) {
      setError('Sector is required.')
      return
    }

    if (!Number.isFinite(currentPrice) || currentPrice < 0) {
      setError('Current price must be 0 or greater.')
      return
    }

    if (targetEntry != null && (!Number.isFinite(targetEntry) || targetEntry < 0)) {
      setError('Target entry must be 0 or greater.')
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

    if (
      scorecardOverall != null &&
      (!Number.isFinite(scorecardOverall) || scorecardOverall < 0 || scorecardOverall > 10)
    ) {
      setError('Scorecard overall must be between 0 and 10.')
      return
    }

    if (!values.date_added) {
      setError('Date added is required.')
      return
    }

    await onSubmit({
      ticker,
      company,
      sector,
      why_watching: whyWatching || null,
      target_entry: targetEntry,
      current_price: currentPrice,
      fair_value_low: fairValueLow,
      fair_value_high: fairValueHigh,
      scorecard_overall: scorecardOverall,
      status: values.status,
      date_added: values.date_added,
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
            placeholder="NVDA"
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
            placeholder="NVIDIA"
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
            Status
          </span>
          <select
            value={values.status}
            onChange={(e) => update('status', e.target.value as WatchlistStatus)}
            className="ui-select"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Current price
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.current_price}
            onChange={(e) => update('current_price', e.target.value)}
            className="ui-input"
            placeholder="950.00"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Target entry
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.target_entry}
            onChange={(e) => update('target_entry', e.target.value)}
            className="ui-input"
            placeholder="875.00"
          />
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
            placeholder="900.00"
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
            placeholder="1100.00"
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
            placeholder="8.5"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Date added
          </span>
          <input
            type="date"
            value={values.date_added}
            onChange={(e) => update('date_added', e.target.value)}
            className="ui-input"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
          Why watching
        </span>
        <textarea
          value={values.why_watching}
          onChange={(e) => update('why_watching', e.target.value)}
          className="ui-textarea min-h-28"
          placeholder="What makes this business interesting right now?"
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