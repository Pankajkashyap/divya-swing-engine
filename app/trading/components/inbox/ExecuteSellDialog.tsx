'use client'

import { useMemo, useState } from 'react'
import { PendingAction } from '@/app/trading/inbox/page'

type Props = {
  action: PendingAction
  mode: 'full' | 'partial'
  onConfirm: (params: { exitPrice: number; exitShares: number; notes: string }) => void | Promise<void>
  onCancel: () => void
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function ExecuteSellDialog({ action, mode, onConfirm, onCancel }: Props) {
  const payload = useMemo(() => action.payload_json ?? {}, [action.payload_json])
  const suggestedFullShares = asNumber(payload.shares_remaining) ?? asNumber(payload.shares_entered) ?? 0

  const [exitPrice, setExitPrice] = useState('')
  const [exitShares, setExitShares] = useState(
    mode === 'full' && suggestedFullShares > 0 ? String(suggestedFullShares) : ''
  )
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ exitPrice?: string; exitShares?: string }>({})

  const handleSubmit = async () => {
    const nextErrors: { exitPrice?: string; exitShares?: string } = {}
    const parsedExitPrice = Number(exitPrice)
    const parsedExitShares = Number(exitShares)

    if (!Number.isFinite(parsedExitPrice) || parsedExitPrice <= 0) {
      nextErrors.exitPrice = 'Enter a valid exit price'
    }

    if (!Number.isInteger(parsedExitShares) || parsedExitShares <= 0) {
      nextErrors.exitShares = 'Enter a valid whole number of shares'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    await onConfirm({
      exitPrice: parsedExitPrice,
      exitShares: parsedExitShares,
      notes,
    })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-neutral-900">
          {mode === 'full' ? 'Execute Full Sale' : 'Execute Partial Sale'} — {action.ticker}
        </h2>

        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          <div>Entry price: {String(payload.entry_price ?? '—')}</div>
          <div className="mt-1">Current stop price: {String(payload.stop_price_current ?? payload.stop_price ?? '—')}</div>
          <div className="mt-1">Target 1: {String(payload.target_1_price ?? '—')}</div>
          <div className="mt-1">Target 2: {String(payload.target_2_price ?? '—')}</div>
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Exit price
            </label>
            <input
              type="number"
              step="any"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              className="ui-input"
            />
            {errors.exitPrice ? (
              <div className="mt-1 text-sm text-red-600">{errors.exitPrice}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Exit shares
            </label>
            <input
              type="number"
              step="1"
              value={exitShares}
              onChange={(e) => setExitShares(e.target.value)}
              className="ui-input"
            />
            {errors.exitShares ? (
              <div className="mt-1 text-sm text-red-600">{errors.exitShares}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="ui-input"
              placeholder="Optional notes"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="ui-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="ui-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Working...' : 'Confirm Sale'}
          </button>
        </div>
      </div>
    </div>
  )
}