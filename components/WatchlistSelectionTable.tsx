'use client'

import { useEffect, useMemo, useState } from 'react'
import type { WatchlistRow } from '@/app/page'
import { WatchlistLogModal } from '@/components/WatchlistLogModal'

type Props = {
  watchlist: WatchlistRow[]
  stock: WatchlistRow | null
  onSelect: (row: WatchlistRow) => void
  onUpdate: (
    rowId: string,
    payload: {
      companyName: string
      setupGrade: string
      entryZoneLow: string
      entryZoneHigh: string
      stopPrice: string
      target1Price: string
      target2Price: string
      earningsWithin2Weeks: boolean
      binaryEventRisk: boolean
      epsGrowth: string
      epsAccelerating: boolean
      revenueGrowth: string
      accDistRating: string
      industryRank: string
    }
  ) => void | Promise<void>
  onDelete: (rowId: string, ticker: string) => void | Promise<void>
}

type FieldErrors = {
  entryZoneLow?: string
  entryZoneHigh?: string
  stopPrice?: string
  target1Price?: string
  target2Price?: string
  form?: string
}

function getWatchlistQuality(row: WatchlistRow): {
  label: 'Valid' | 'Invalid' | 'Incomplete'
  className: string
  reason: string | null
} {
  const entryLow = row.entry_zone_low
  const entryHigh = row.entry_zone_high
  const stop = row.stop_price
  const target1 = row.target_1_price

  const hasCoreFields =
    entryLow !== null &&
    entryHigh !== null &&
    stop !== null &&
    target1 !== null

  if (!hasCoreFields) {
    return {
      label: 'Incomplete',
      className: 'ui-pill-neutral',
      reason: 'Missing required trade-planning fields.',
    }
  }

  if (entryHigh < entryLow) {
    return {
      label: 'Invalid',
      className: 'ui-pill-danger',
      reason: 'Entry Zone High is below Entry Zone Low.',
    }
  }

  if (stop >= entryLow) {
    return {
      label: 'Invalid',
      className: 'ui-pill-danger',
      reason: 'Stop must be below Entry Zone Low for long trades.',
    }
  }

  if (target1 <= entryLow) {
    return {
      label: 'Invalid',
      className: 'ui-pill-danger',
      reason: 'Target 1 must be above Entry Zone Low.',
    }
  }

  const riskPerShare = entryLow - stop
  const rewardPerShare = target1 - entryLow
  const expectedRR = riskPerShare > 0 ? rewardPerShare / riskPerShare : 0

  if (expectedRR < 2) {
    return {
      label: 'Invalid',
      className: 'ui-pill-danger',
      reason: `Expected R/R is ${expectedRR.toFixed(2)}. Minimum is 2.00.`,
    }
  }

  return {
    label: 'Valid',
    className: 'ui-pill-success',
    reason: null,
  }
}

export function WatchlistSelectionTable({
  watchlist,
  stock,
  onSelect,
  onUpdate,
  onDelete,
}: Props) {
  const [editingRow, setEditingRow] = useState<WatchlistRow | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [setupGrade, setSetupGrade] = useState('A')
  const [entryZoneLow, setEntryZoneLow] = useState('')
  const [entryZoneHigh, setEntryZoneHigh] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [target1Price, setTarget1Price] = useState('')
  const [target2Price, setTarget2Price] = useState('')
  const [earningsWithin2Weeks, setEarningsWithin2Weeks] = useState(false)
  const [binaryEventRisk, setBinaryEventRisk] = useState(false)
  const [epsGrowth, setEpsGrowth] = useState('')
  const [epsAccelerating, setEpsAccelerating] = useState(false)
  const [revenueGrowth, setRevenueGrowth] = useState('')
  const [accDistRating, setAccDistRating] = useState('A')
  const [industryRank, setIndustryRank] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [logModalRow, setLogModalRow] = useState<{ ticker: string; id: string } | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!editingRow) return

    setCompanyName(editingRow.company_name ?? '')
    setSetupGrade(editingRow.setup_grade ?? 'A')
    setEntryZoneLow(editingRow.entry_zone_low?.toString() ?? '')
    setEntryZoneHigh(editingRow.entry_zone_high?.toString() ?? '')
    setStopPrice(editingRow.stop_price?.toString() ?? '')
    setTarget1Price(editingRow.target_1_price?.toString() ?? '')
    setTarget2Price(editingRow.target_2_price?.toString() ?? '')
    setEarningsWithin2Weeks(editingRow.earnings_within_2_weeks ?? false)
    setBinaryEventRisk(editingRow.binary_event_risk ?? false)
    setEpsGrowth(editingRow.eps_growth_pct?.toString() ?? '')
    setEpsAccelerating(editingRow.eps_accelerating ?? false)
    setRevenueGrowth(editingRow.revenue_growth_pct?.toString() ?? '')
    setAccDistRating(editingRow.acc_dist_rating ?? 'A')
    setIndustryRank(editingRow.industry_group_rank?.toString() ?? '')
    setErrors({})
  }, [editingRow])

  const preview = useMemo(() => {
    const low = Number(entryZoneLow)
    const stop = Number(stopPrice)
    const target1 = Number(target1Price)

    const hasCoreNumbers =
      Number.isFinite(low) &&
      low > 0 &&
      Number.isFinite(stop) &&
      stop > 0 &&
      Number.isFinite(target1) &&
      target1 > 0

    if (!hasCoreNumbers) {
      return {
        riskPerShare: null as number | null,
        rewardPerShare: null as number | null,
        expectedRR: null as number | null,
      }
    }

    const riskPerShare = low - stop
    const rewardPerShare = target1 - low
    const expectedRR =
      riskPerShare > 0 ? Number((rewardPerShare / riskPerShare).toFixed(2)) : null

    return {
      riskPerShare: Number(riskPerShare.toFixed(2)),
      rewardPerShare: Number(rewardPerShare.toFixed(2)),
      expectedRR,
    }
  }, [entryZoneLow, stopPrice, target1Price])

  const validateEdit = (): FieldErrors => {
    const nextErrors: FieldErrors = {}

    const low = Number(entryZoneLow)
    const high = Number(entryZoneHigh)
    const stop = Number(stopPrice)
    const target1 = Number(target1Price)
    const target2 = Number(target2Price)

    if (!entryZoneLow || !Number.isFinite(low) || low <= 0) {
      nextErrors.entryZoneLow = 'Enter a valid Entry Zone Low.'
    }

    if (!entryZoneHigh || !Number.isFinite(high) || high <= 0) {
      nextErrors.entryZoneHigh = 'Enter a valid Entry Zone High.'
    }

    if (
      Number.isFinite(low) &&
      Number.isFinite(high) &&
      low > 0 &&
      high > 0 &&
      high < low
    ) {
      nextErrors.entryZoneHigh =
        'Entry Zone High must be greater than or equal to Entry Zone Low.'
    }

    if (!stopPrice || !Number.isFinite(stop) || stop <= 0) {
      nextErrors.stopPrice = 'Enter a valid Stop Price.'
    }

    if (
      Number.isFinite(low) &&
      low > 0 &&
      Number.isFinite(stop) &&
      stop > 0 &&
      stop >= low
    ) {
      nextErrors.stopPrice = 'Stop must be below Entry Zone Low.'
    }

    if (!target1Price || !Number.isFinite(target1) || target1 <= 0) {
      nextErrors.target1Price = 'Enter a valid Target 1 Price.'
    }

    if (
      Number.isFinite(low) &&
      low > 0 &&
      Number.isFinite(target1) &&
      target1 > 0 &&
      target1 <= low
    ) {
      nextErrors.target1Price = 'Target 1 must be above Entry Zone Low.'
    }

    if (target2Price) {
      if (!Number.isFinite(target2) || target2 <= 0) {
        nextErrors.target2Price = 'Enter a valid Target 2 Price.'
      } else if (Number.isFinite(target1) && target1 > 0 && target2 < target1) {
        nextErrors.target2Price =
          'Target 2 must be greater than or equal to Target 1.'
      }
    }

    if (
      Number.isFinite(low) &&
      low > 0 &&
      Number.isFinite(stop) &&
      stop > 0 &&
      Number.isFinite(target1) &&
      target1 > 0
    ) {
      const riskPerShare = low - stop
      const rewardPerShare = target1 - low
      const expectedRR = riskPerShare > 0 ? rewardPerShare / riskPerShare : 0

      if (riskPerShare <= 0) {
        nextErrors.form = 'Invalid setup: stop placement is wrong.'
      } else if (rewardPerShare <= 0) {
        nextErrors.form = 'Invalid setup: target must be above entry.'
      } else if (expectedRR < 2) {
        nextErrors.form = `Expected R/R is ${expectedRR.toFixed(
          2
        )}. Minimum required is 2.00.`
      }
    }

    return nextErrors
  }

  const handleSelect = (
    row: WatchlistRow,
    quality: ReturnType<typeof getWatchlistQuality>
  ) => {
    if (quality.label !== 'Valid') {
      alert(quality.reason ?? 'Fix this row before selecting.')
      return
    }

    onSelect(row)
  }

  const handleSaveEdit = async () => {
    if (!editingRow) return

    const nextErrors = validateEdit()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setSavingEdit(true)

    try {
      await onUpdate(editingRow.id, {
        companyName,
        setupGrade,
        entryZoneLow,
        entryZoneHigh,
        stopPrice,
        target1Price,
        target2Price,
        earningsWithin2Weeks,
        binaryEventRisk,
        epsGrowth,
        epsAccelerating,
        revenueGrowth,
        accDistRating,
        industryRank,
      })

      setEditingRow(null)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteConfirm = async (row: WatchlistRow) => {
    await onDelete(row.id, row.ticker)
    setPendingDeleteId(null)
  }

  const rrClass =
    preview.expectedRR === null
      ? 'text-neutral-900 dark:text-[#e6eaf0]'
      : preview.expectedRR >= 2
        ? 'text-green-700 dark:text-[#8fd0ab]'
        : 'text-red-700 dark:text-[#f0a3a3]'

  return (
    <>
      <div className="ui-section mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            Watchlist Selection
          </h2>
          <p className="text-sm text-neutral-500 dark:text-[#a8b2bf]">
            {watchlist.length} records
          </p>
        </div>

        {watchlist.length === 0 ? (
          <p className="text-neutral-600 dark:text-[#a8b2bf]">
            No watchlist stocks yet.
          </p>
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Edit</th>
                  <th>Log</th>
                  <th>Delete</th>
                  <th>Ticker</th>
                  <th>Company</th>
                  <th>Quality</th>
                  <th>Grade</th>
                  <th>Entry Zone</th>
                  <th>Stop</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((row) => {
                  const quality = getWatchlistQuality(row)
                  const isSelected = stock?.id === row.id

                  return (
                    <tr key={row.id}>
                      <td>
                        <button
                          onClick={() => handleSelect(row, quality)}
                          disabled={quality.label !== 'Valid'}
                          title={
                            quality.label === 'Valid'
                              ? 'Select this trade candidate'
                              : quality.reason ?? 'Fix this row before selecting'
                          }
                          className="ui-btn-secondary px-3 py-1 text-xs"
                        >
                          {isSelected
                            ? 'Selected'
                            : quality.label === 'Valid'
                              ? 'Select'
                              : quality.label}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => setEditingRow(row)}
                          className="ui-btn-secondary px-3 py-1 text-xs"
                        >
                          Edit
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            setLogModalRow({
                              ticker: row.ticker,
                              id: row.id,
                            })
                          }
                          className="text-neutral-400 hover:text-neutral-700 dark:text-[#a8b2bf] dark:hover:text-[#e6eaf0] transition-colors"
                          title="View history"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16 a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                        </button>
                      </td>
                      <td>
                        {pendingDeleteId !== row.id ? (
                          <button
                            onClick={() => setPendingDeleteId(row.id)}
                            className="ui-btn-danger px-3 py-1 text-xs"
                          >
                            Delete
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => void handleDeleteConfirm(row)}
                                className="ui-btn-danger px-3 py-1 text-xs"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setPendingDeleteId(null)}
                                className="ui-btn-secondary px-3 py-1 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                            <p className="text-xs text-red-600 dark:text-[#f0a3a3]">
                              This cannot be undone.
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="font-medium">{row.ticker}</td>
                      <td>{row.company_name ?? '—'}</td>
                      <td>
                        <span className={quality.className}>{quality.label}</span>
                      </td>
                      <td>{row.setup_grade ?? '—'}</td>
                      <td>
                        {row.entry_zone_low ?? '—'} - {row.entry_zone_high ?? '—'}
                      </td>
                      <td>{row.stop_price ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="ui-modal max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  Edit Watchlist Row — {editingRow.ticker}
                </h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-[#a8b2bf]">
                  Fix incomplete or invalid data and save changes.
                </p>
              </div>

              <button
                onClick={() => setEditingRow(null)}
                className="ui-btn-secondary px-3 py-1 text-xs"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Company Name
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="ui-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Setup Grade
                </label>
                <select
                  value={setupGrade}
                  onChange={(e) => setSetupGrade(e.target.value)}
                  className="ui-select"
                >
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Entry Zone Low
                </label>
                <input
                  value={entryZoneLow}
                  onChange={(e) => setEntryZoneLow(e.target.value)}
                  className="ui-input"
                  type="number"
                  step="0.01"
                />
                {errors.entryZoneLow ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-[#f0a3a3]">
                    {errors.entryZoneLow}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Entry Zone High
                </label>
                <input
                  value={entryZoneHigh}
                  onChange={(e) => setEntryZoneHigh(e.target.value)}
                  className="ui-input"
                  type="number"
                  step="0.01"
                />
                {errors.entryZoneHigh ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-[#f0a3a3]">
                    {errors.entryZoneHigh}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Stop Price
                </label>
                <input
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  className="ui-input"
                  type="number"
                  step="0.01"
                />
                {errors.stopPrice ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-[#f0a3a3]">
                    {errors.stopPrice}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Target 1 Price
                </label>
                <input
                  value={target1Price}
                  onChange={(e) => setTarget1Price(e.target.value)}
                  className="ui-input"
                  type="number"
                  step="0.01"
                />
                {errors.target1Price ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-[#f0a3a3]">
                    {errors.target1Price}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Target 2 Price
                </label>
                <input
                  value={target2Price}
                  onChange={(e) => setTarget2Price(e.target.value)}
                  className="ui-input"
                  type="number"
                  step="0.01"
                />
                {errors.target2Price ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-[#f0a3a3]">
                    {errors.target2Price}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  EPS Growth %
                </label>
                <input
                  value={epsGrowth}
                  onChange={(e) => setEpsGrowth(e.target.value)}
                  className="ui-input"
                  type="number"
                  step="0.1"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Revenue Growth %
                </label>
                <input
                  value={revenueGrowth}
                  onChange={(e) => setRevenueGrowth(e.target.value)}
                  className="ui-input"
                  type="number"
                  step="0.1"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Accumulation / Distribution Rating
                </label>
                <select
                  value={accDistRating}
                  onChange={(e) => setAccDistRating(e.target.value)}
                  className="ui-select"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Industry Group Rank
                </label>
                <input
                  value={industryRank}
                  onChange={(e) => setIndustryRank(e.target.value)}
                  className="ui-input"
                  type="number"
                  min="1"
                  max="197"
                  step="1"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-start gap-3 text-sm text-neutral-900 dark:text-[#e6eaf0]">
                  <input
                    type="checkbox"
                    checked={epsAccelerating}
                    onChange={(e) => setEpsAccelerating(e.target.checked)}
                    className="mt-1"
                  />
                  <span>EPS Accelerating</span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-start gap-3 text-sm text-neutral-900 dark:text-[#e6eaf0]">
                  <input
                    type="checkbox"
                    checked={earningsWithin2Weeks}
                    onChange={(e) => setEarningsWithin2Weeks(e.target.checked)}
                    className="mt-1"
                  />
                  <span>Earnings within 2 weeks</span>
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-start gap-3 text-sm text-neutral-900 dark:text-[#e6eaf0]">
                  <input
                    type="checkbox"
                    checked={binaryEventRisk}
                    onChange={(e) => setBinaryEventRisk(e.target.checked)}
                    className="mt-1"
                  />
                  <span>Binary event risk</span>
                </label>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-[#2a313b] dark:bg-[#20262e]">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Live Setup Preview
              </h4>

              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-[#a8b2bf]">
                    Risk / Share
                  </p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                    {preview.riskPerShare ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-[#a8b2bf]">
                    Reward / Share
                  </p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                    {preview.rewardPerShare ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-[#a8b2bf]">
                    Expected R/R
                  </p>
                  <p className={['mt-1 text-lg font-semibold', rrClass].join(' ')}>
                    {preview.expectedRR ?? '—'}
                  </p>
                </div>
              </div>
            </div>

            {errors.form ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-[#5a2d33] dark:bg-[#3a2227] dark:text-[#f0a3a3]">
                {errors.form}
              </div>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => void handleSaveEdit()}
                disabled={savingEdit}
                className="ui-btn-primary"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                onClick={() => setEditingRow(null)}
                className="ui-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {logModalRow ? (
        <WatchlistLogModal
          ticker={logModalRow.ticker}
          watchlistId={logModalRow.id}
          onClose={() => setLogModalRow(null)}
        />
      ) : null}
    </>
  )
}