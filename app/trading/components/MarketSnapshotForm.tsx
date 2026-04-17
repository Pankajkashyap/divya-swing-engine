'use client'

import { useState } from 'react'
import { Tooltip } from '@/components/ui/Tooltip'

type Props = {
  onSave: (payload: {
    snapshotDate: string
    marketPhase: string
    maxLongExposurePct: string
  }) => void | Promise<void>
  initialDate?: string | null
  initialPhase?: string | null
  initialExposure?: number | null
}

export function MarketSnapshotForm({ onSave, initialDate, initialPhase, initialExposure }: Props) {
  const today = new Date().toLocaleDateString('en-CA')
  const [snapshotDate, setSnapshotDate] = useState(initialDate ?? today)
  const [marketPhase, setMarketPhase] = useState(initialPhase ?? 'confirmed_uptrend')
  const [maxLongExposurePct, setMaxLongExposurePct] = useState(
    initialExposure != null ? String(initialExposure) : '100'
  )

  const handleSubmit = async () => {
    await onSave({ snapshotDate, marketPhase, maxLongExposurePct })
  }

  return (
    <div className="ui-section mt-8">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
        Market Snapshot
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Snapshot Date
          </label>
          <input
            type="date"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
            className="ui-input"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
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
          <label className="mb-1 flex items-center gap-1 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
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