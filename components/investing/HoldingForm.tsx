'use client'

import { useMemo, useState } from 'react'
import type { AccountType, BucketType, Holding, ThesisStatus } from '@/app/investing/types'

type HoldingFormValues = {
  ticker: string
  company: string
  account: AccountType
  base_currency: string
  sector: string
  shares: string
  avg_cost: string
  current_price: string
  thesis: string
  thesis_breakers: string
  thesis_status: ThesisStatus
  date_bought: string
  bucket: BucketType | ''
}

type HoldingFormPayload = {
  ticker: string
  company: string
  account: AccountType
  base_currency: string
  sector: string
  shares: number
  avg_cost: number
  current_price: number
  thesis: string | null
  thesis_breakers: string | null
  thesis_status: ThesisStatus
  date_bought: string | null
  bucket: BucketType | null
}

type Props = {
  initialHolding?: Holding | null
  onSubmit: (values: HoldingFormPayload) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
  busy?: boolean
}

const accountOptions: AccountType[] = ['TFSA', 'Non-registered']

const thesisStatusOptions: ThesisStatus[] = [
  'Intact',
  'Strengthening',
  'Under review',
  'Weakening',
  'Broken',
]

const bucketOptions: BucketType[] = [
  'Core compounder',
  'Quality growth',
  'Special opportunity',
  'TFSA Cash',
  'Non-registered Cash',
]

const sectorOptions = [
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

function toFormValues(holding?: Holding | null): HoldingFormValues {
  return {
    ticker: holding?.ticker ?? '',
    company: holding?.company ?? '',
    account: holding?.account ?? 'TFSA',
    base_currency: holding?.base_currency ?? 'USD',
    sector: holding?.sector === 'Cash' ? '' : (holding?.sector ?? ''),
    shares: holding?.shares != null ? String(holding.shares) : '',
    avg_cost: holding?.avg_cost != null ? String(holding.avg_cost) : '',
    current_price: holding?.current_price != null ? String(holding.current_price) : '',
    thesis: holding?.thesis ?? '',
    thesis_breakers: holding?.thesis_breakers ?? '',
    thesis_status: holding?.thesis_status ?? 'Intact',
    date_bought: holding?.date_bought ?? '',
    bucket: holding?.bucket ?? '',
  }
}

function normalizeValues(values: HoldingFormValues): HoldingFormValues {
  const isCashBucket =
    values.bucket === 'TFSA Cash' || values.bucket === 'Non-registered Cash'

  if (!isCashBucket) return values

  return {
    ...values,
    sector: '',
    thesis_status: 'Intact',
  }
}

export function HoldingForm({
  initialHolding,
  onSubmit,
  onCancel,
  submitLabel = 'Save holding',
  busy = false,
}: Props) {
  const initialValues = useMemo(() => toFormValues(initialHolding), [initialHolding])
  const [values, setValues] = useState<HoldingFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)

  const displayValues = useMemo(() => normalizeValues(values), [values])

  const isCashBucket = useMemo(
    () =>
      displayValues.bucket === 'TFSA Cash' ||
      displayValues.bucket === 'Non-registered Cash',
    [displayValues.bucket]
  )

  function update<K extends keyof HoldingFormValues>(key: K, value: HoldingFormValues[K]) {
    setError(null)
    setValues((prev) => normalizeValues({ ...prev, [key]: value }))
  }

  function handleReset() {
    setValues(initialValues)
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const ticker = displayValues.ticker.trim().toUpperCase()
    const company = displayValues.company.trim()
    const sector = displayValues.sector.trim()
    const baseCurrency = displayValues.base_currency.trim().toUpperCase()
    const shares = Number(displayValues.shares)
    const avgCost = Number(displayValues.avg_cost)
    const currentPrice = Number(displayValues.current_price)

    if (!ticker) {
      setError('Ticker is required.')
      return
    }

    if (!company) {
      setError('Company is required.')
      return
    }

    if (!baseCurrency) {
      setError('Base currency is required.')
      return
    }

    if (!Number.isFinite(shares) || shares < 0) {
      setError('Shares must be 0 or greater.')
      return
    }

    if (!Number.isFinite(avgCost) || avgCost < 0) {
      setError('Average cost must be 0 or greater.')
      return
    }

    if (!Number.isFinite(currentPrice) || currentPrice < 0) {
      setError('Current price must be 0 or greater.')
      return
    }

    if (!isCashBucket && !sector) {
      setError('Sector is required for non-cash holdings.')
      return
    }

    if (displayValues.bucket === 'TFSA Cash' && displayValues.account !== 'TFSA') {
      setError('TFSA Cash bucket must use the TFSA account.')
      return
    }

    if (
      displayValues.bucket === 'Non-registered Cash' &&
      displayValues.account !== 'Non-registered'
    ) {
      setError('Non-registered Cash bucket must use the Non-registered account.')
      return
    }

    await onSubmit({
      ticker,
      company,
      account: displayValues.account,
      base_currency: baseCurrency,
      sector: isCashBucket ? 'Cash' : sector,
      shares,
      avg_cost: avgCost,
      current_price: currentPrice,
      thesis: displayValues.thesis.trim() || null,
      thesis_breakers: displayValues.thesis_breakers.trim() || null,
      thesis_status: displayValues.thesis_status,
      date_bought: displayValues.date_bought || null,
      bucket: displayValues.bucket || null,
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
            value={displayValues.ticker}
            onChange={(e) => update('ticker', e.target.value)}
            className="ui-input"
            placeholder="MSFT"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Company
          </span>
          <input
            value={displayValues.company}
            onChange={(e) => update('company', e.target.value)}
            className="ui-input"
            placeholder="Microsoft"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Account
          </span>
          <select
            value={displayValues.account}
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
            Bucket
          </span>
          <select
            value={displayValues.bucket}
            onChange={(e) => update('bucket', e.target.value as BucketType | '')}
            className="ui-select"
          >
            <option value="">Select bucket</option>
            {bucketOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Base currency
          </span>
          <select
            value={displayValues.base_currency}
            onChange={(e) => update('base_currency', e.target.value)}
            className="ui-select"
          >
            <option value="USD">USD</option>
            <option value="CAD">CAD</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Sector
          </span>
          <select
            value={isCashBucket ? 'Cash' : displayValues.sector}
            onChange={(e) => update('sector', e.target.value)}
            className="ui-select"
            disabled={isCashBucket}
          >
            <option value="">{isCashBucket ? 'Cash' : 'Select sector'}</option>
            {!isCashBucket &&
              sectorOptions.map((option) => (
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
            value={displayValues.shares}
            onChange={(e) => update('shares', e.target.value)}
            className="ui-input"
            placeholder="10"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Avg cost
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={displayValues.avg_cost}
            onChange={(e) => update('avg_cost', e.target.value)}
            className="ui-input"
            placeholder="125.50"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Current price
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={displayValues.current_price}
            onChange={(e) => update('current_price', e.target.value)}
            className="ui-input"
            placeholder="142.58"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Date bought
          </span>
          <input
            type="date"
            value={displayValues.date_bought}
            onChange={(e) => update('date_bought', e.target.value)}
            className="ui-input"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Thesis status
          </span>
          <select
            value={displayValues.thesis_status}
            onChange={(e) => update('thesis_status', e.target.value as ThesisStatus)}
            className="ui-select"
            disabled={isCashBucket}
          >
            {thesisStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
          Thesis
        </span>
        <textarea
          value={displayValues.thesis}
          onChange={(e) => update('thesis', e.target.value)}
          className="ui-textarea min-h-28"
          placeholder="Why do you own this business?"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
          Thesis breakers
        </span>
        <textarea
          value={displayValues.thesis_breakers}
          onChange={(e) => update('thesis_breakers', e.target.value)}
          className="ui-textarea min-h-24"
          placeholder="What would invalidate the thesis?"
        />
      </label>

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