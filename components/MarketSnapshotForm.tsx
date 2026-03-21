'use client'

import { useState } from 'react'

type Props = {
  onSave: (payload: {
    snapshotDate: string
    marketPhase: string
    maxLongExposurePct: string
  }) => void | Promise<void>
}

export function MarketSnapshotForm({ onSave }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [snapshotDate, setSnapshotDate] = useState(today)
  const [marketPhase, setMarketPhase] = useState('confirmed_uptrend')
  const [maxLongExposurePct, setMaxLongExposurePct] = useState('100')

  const handleSubmit = async () => {
    await onSave({
      snapshotDate,
      marketPhase,
      maxLongExposurePct,
    })
  }

  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
      <h2 className="text-lg font-semibold">Market Snapshot</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Snapshot Date</label>
          <input
            type="date"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Market Phase</label>
          <select
            value={marketPhase}
            onChange={(e) => setMarketPhase(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="confirmed_uptrend">confirmed_uptrend</option>
            <option value="under_pressure">under_pressure</option>
            <option value="rally_attempt">rally_attempt</option>
            <option value="correction">correction</option>
            <option value="bear">bear</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Max Long Exposure %</label>
          <input
            value={maxLongExposurePct}
            onChange={(e) => setMaxLongExposurePct(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="100"
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSubmit}
          className="rounded-xl border border-neutral-900 px-5 py-3 text-sm font-medium"
        >
          Save Market Snapshot
        </button>
      </div>
    </div>
  )
}