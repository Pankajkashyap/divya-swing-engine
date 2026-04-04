'use client'

import { useState } from 'react'
import { Tooltip } from '@/components/ui/Tooltip'

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
            className="ui-input"
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-sm font-medium">
            Market Phase
            <Tooltip text="The current broad market condition based on Minervini's timing model. Confirmed uptrend means conditions are good for buying. Correction and Bear mean you should be mostly or fully in cash." />
          </label>
          <select
            value={marketPhase}
            onChange={(e) => setMarketPhase(e.target.value)}
            className="ui-select"
          >
            <option value="confirmed_uptrend">confirmed_uptrend</option>
            <option value="under_pressure">under_pressure</option>
            <option value="rally_attempt">rally_attempt</option>
            <option value="correction">correction</option>
            <option value="bear">bear</option>
          </select>
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-sm font-medium">
            Max Long Exposure %
            <Tooltip text="The maximum percentage of your portfolio you are allowed to deploy in new trades while this market phase is active." />
          </label>
          <input
            value={maxLongExposurePct}
            onChange={(e) => setMaxLongExposurePct(e.target.value)}
            className="ui-input"
            placeholder="100"
          />
        </div>
      </div>

      <div className="mt-4">
        <button onClick={handleSubmit} className="ui-btn-primary">
          Save Market Snapshot
        </button>
      </div>
    </div>
  )
}