'use client'

import { useMemo, useState } from 'react'
import { PendingAction } from '@/app/trading/inbox/page'

type Props = {
  action: PendingAction
  onConfirm: (params: {
    actualFillPrice: number
    actualQuantity: number
    notes: string
    emotionalState: string
    convictionLevel: string
    entryThesis: string
    topRisk: string
  }) => void | Promise<void>
  onCancel: () => void
}


export function ExecuteBuyDialog({ action, onConfirm, onCancel }: Props) {
  const [actualFillPrice, setActualFillPrice] = useState('')
  const [actualQuantity, setActualQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [emotionalState, setEmotionalState] = useState('')
  const [convictionLevel, setConvictionLevel] = useState('')
  const [entryThesis, setEntryThesis] = useState('')
  const [topRisk, setTopRisk] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ fillPrice?: string; quantity?: string }>({})

  const payload = useMemo(() => action.payload_json ?? {}, [action.payload_json])

  const handleSubmit = async () => {
    const nextErrors: { fillPrice?: string; quantity?: string } = {}
    const fillPrice = Number(actualFillPrice)
    const quantity = Number(actualQuantity)

    if (!Number.isFinite(fillPrice) || fillPrice <= 0) {
      nextErrors.fillPrice = 'Enter a valid fill price'
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      nextErrors.quantity = 'Enter a valid whole number of shares'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    await onConfirm({
      actualFillPrice: fillPrice,
      actualQuantity: quantity,
      notes,
      emotionalState,
      convictionLevel,
      entryThesis,
      topRisk,
    })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-neutral-900">
          Execute Buy — {action.ticker}
        </h2>

        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          <div>Entry zone: {String(payload.entry_zone_low ?? '—')} – {String(payload.entry_zone_high ?? '—')}</div>
          <div className="mt-1">Stop price: {String(payload.stop_price ?? '—')}</div>
          <div className="mt-1">Target 1: {String(payload.target_1_price ?? '—')}</div>
          <div className="mt-1">Expected R/R: {String(payload.expected_rr ?? '—')}</div>
          <div className="mt-1">Setup grade: {String(payload.setup_grade ?? '—')}</div>
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Actual fill price
            </label>
            <input
              type="number"
              step="any"
              value={actualFillPrice}
              onChange={(e) => setActualFillPrice(e.target.value)}
              className="ui-input"
            />
            {errors.fillPrice ? (
              <div className="mt-1 text-sm text-red-600">{errors.fillPrice}</div>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Actual quantity / shares
            </label>
            <input
              type="number"
              step="1"
              value={actualQuantity}
              onChange={(e) => setActualQuantity(e.target.value)}
              className="ui-input"
            />
            {errors.quantity ? (
              <div className="mt-1 text-sm text-red-600">{errors.quantity}</div>
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

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Emotional state at entry
            </label>
            <select
              value={emotionalState}
              onChange={(e) => setEmotionalState(e.target.value)}
              className="ui-select"
            >
              <option value="">Select...</option>
              <option value="calm">Calm</option>
              <option value="confident">Confident</option>
              <option value="neutral">Neutral</option>
              <option value="anxious">Anxious</option>
              <option value="fomo">FOMO</option>
              <option value="impatient">Impatient</option>
              <option value="excited">Excited</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Conviction level
            </label>
            <select
              value={convictionLevel}
              onChange={(e) => setConvictionLevel(e.target.value)}
              className="ui-select"
            >
              <option value="">Select...</option>
              <option value="very_high">Very High</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Entry thesis
            </label>
            <textarea
              value={entryThesis}
              onChange={(e) => setEntryThesis(e.target.value)}
              className="ui-textarea min-h-20"
              placeholder="1-2 sentences: why are you taking this trade?"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Top risk
            </label>
            <textarea
              value={topRisk}
              onChange={(e) => setTopRisk(e.target.value)}
              className="ui-textarea min-h-16"
              placeholder="The single biggest risk if this trade fails"
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
            {submitting ? 'Working...' : 'Confirm Execution'}
          </button>
        </div>
      </div>
    </div>
  )
}