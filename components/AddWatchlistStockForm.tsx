'use client'

import { useMemo, useState } from 'react'

type Props = {
  onAdd: (payload: {
    ticker: string
    companyName: string
    setupGrade: string
    entryZoneLow: string
    entryZoneHigh: string
    stopPrice: string
    target1Price: string
    target2Price: string
    trendTemplatePass: boolean
    volumeDryUpPass: boolean
    rsLineConfirmed: boolean
    basePatternValid: boolean
    entryNearPivot: boolean
    volumeBreakoutConfirmed: boolean
    liquidityPass: boolean
    earningsWithin2Weeks: boolean
    binaryEventRisk: boolean
    epsGrowth: string
    epsAccelerating: boolean
    revenueGrowth: string
    accDistRating: string
    industryRank: string
  }) => void | Promise<void>
}

type FieldErrors = {
  ticker?: string
  entryZoneLow?: string
  entryZoneHigh?: string
  stopPrice?: string
  target1Price?: string
  target2Price?: string
  form?: string
}

export function AddWatchlistStockForm({ onAdd }: Props) {
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [setupGrade, setSetupGrade] = useState('A')
  const [entryZoneLow, setEntryZoneLow] = useState('')
  const [entryZoneHigh, setEntryZoneHigh] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [target1Price, setTarget1Price] = useState('')
  const [target2Price, setTarget2Price] = useState('')

  const [trendTemplatePass, setTrendTemplatePass] = useState(false)
  const [volumeDryUpPass, setVolumeDryUpPass] = useState(false)
  const [rsLineConfirmed, setRsLineConfirmed] = useState(false)
  const [basePatternValid, setBasePatternValid] = useState(false)
  const [entryNearPivot, setEntryNearPivot] = useState(false)
  const [volumeBreakoutConfirmed, setVolumeBreakoutConfirmed] = useState(false)
  const [liquidityPass, setLiquidityPass] = useState(true)
  const [earningsWithin2Weeks, setEarningsWithin2Weeks] = useState(false)
  const [binaryEventRisk, setBinaryEventRisk] = useState(false)

  const [epsGrowth, setEpsGrowth] = useState('')
  const [epsAccelerating, setEpsAccelerating] = useState(false)
  const [revenueGrowth, setRevenueGrowth] = useState('')
  const [accDistRating, setAccDistRating] = useState('A')
  const [industryRank, setIndustryRank] = useState('')

  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

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
        isValid: false,
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
      isValid:
        riskPerShare > 0 &&
        rewardPerShare > 0 &&
        expectedRR !== null &&
        expectedRR >= 2,
    }
  }, [entryZoneLow, stopPrice, target1Price])

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {}

    const low = Number(entryZoneLow)
    const high = Number(entryZoneHigh)
    const stop = Number(stopPrice)
    const target1 = Number(target1Price)
    const target2 = Number(target2Price)

    if (!ticker.trim()) {
      nextErrors.ticker = 'Ticker is required.'
    }

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
      nextErrors.stopPrice = 'For long trades, Stop Price must be below Entry Zone Low.'
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
      nextErrors.target1Price =
        'Target 1 Price must be greater than Entry Zone Low.'
    }

    if (target2Price) {
      if (!Number.isFinite(target2) || target2 <= 0) {
        nextErrors.target2Price = 'Enter a valid Target 2 Price.'
      } else if (Number.isFinite(target1) && target1 > 0 && target2 < target1) {
        nextErrors.target2Price =
          'Target 2 Price must be greater than or equal to Target 1 Price.'
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
        nextErrors.form = 'Invalid setup: stop placement makes risk/share zero or negative.'
      } else if (rewardPerShare <= 0) {
        nextErrors.form = 'Invalid setup: target must be above entry for a long trade.'
      } else if (expectedRR < 2) {
        nextErrors.form = `Expected R/R is ${expectedRR.toFixed(
          2
        )}. Minimum required is 2.00.`
      }
    }

    return nextErrors
  }

  const handleSubmit = async () => {
    const nextErrors = validate()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)

    try {

      await onAdd({
        ticker,
        companyName,
        setupGrade,
        entryZoneLow,
        entryZoneHigh,
        stopPrice,
        target1Price,
        target2Price,
        trendTemplatePass,
        volumeDryUpPass,
        rsLineConfirmed,
        basePatternValid,
        entryNearPivot,
        volumeBreakoutConfirmed,
        liquidityPass,
        earningsWithin2Weeks,
        binaryEventRisk,
        epsGrowth,
        epsAccelerating,
        revenueGrowth,
        accDistRating,
        industryRank,
      })

      setTicker('')
      setCompanyName('')
      setSetupGrade('A')
      setEntryZoneLow('')
      setEntryZoneHigh('')
      setStopPrice('')
      setTarget1Price('')
      setTarget2Price('')

      setTrendTemplatePass(false)
      setVolumeDryUpPass(false)
      setRsLineConfirmed(false)
      setBasePatternValid(false)
      setEntryNearPivot(false)
      setVolumeBreakoutConfirmed(false)
      setLiquidityPass(true)
      setEarningsWithin2Weeks(false)
      setBinaryEventRisk(false)

      setEpsGrowth('')
      setEpsAccelerating(false)
      setRevenueGrowth('')
      setAccDistRating('A')
      setIndustryRank('')

      setErrors({})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ui-section mt-8">
      <h2 className="text-lg font-semibold">Add Watchlist Stock</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Ticker</label>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="ui-input"
            placeholder="NVDA"
          />
          {errors.ticker ? (
            <p className="mt-1 text-xs text-red-600">{errors.ticker}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Company Name</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="ui-input"
            placeholder="NVIDIA Corp."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Setup Grade</label>
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
          <label className="mb-1 block text-sm font-medium">Entry Zone Low</label>
          <input
            value={entryZoneLow}
            onChange={(e) => setEntryZoneLow(e.target.value)}
            className="ui-input"
            placeholder="100"
            type="number"
            step="0.01"
          />
          {errors.entryZoneLow ? (
            <p className="mt-1 text-xs text-red-600">{errors.entryZoneLow}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Entry Zone High</label>
          <input
            value={entryZoneHigh}
            onChange={(e) => setEntryZoneHigh(e.target.value)}
            className="ui-input"
            placeholder="105"
            type="number"
            step="0.01"
          />
          {errors.entryZoneHigh ? (
            <p className="mt-1 text-xs text-red-600">{errors.entryZoneHigh}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Stop Price</label>
          <input
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            className="ui-input"
            placeholder="95"
            type="number"
            step="0.01"
          />
          {errors.stopPrice ? (
            <p className="mt-1 text-xs text-red-600">{errors.stopPrice}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Target 1 Price</label>
          <input
            value={target1Price}
            onChange={(e) => setTarget1Price(e.target.value)}
            className="ui-input"
            placeholder="120"
            type="number"
            step="0.01"
          />
          {errors.target1Price ? (
            <p className="mt-1 text-xs text-red-600">{errors.target1Price}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Target 2 Price</label>
          <input
            value={target2Price}
            onChange={(e) => setTarget2Price(e.target.value)}
            className="ui-input"
            placeholder="130"
            type="number"
            step="0.01"
          />
          {errors.target2Price ? (
            <p className="mt-1 text-xs text-red-600">{errors.target2Price}</p>
          ) : null}
        </div>
                <div>
          <label className="mb-1 block text-sm font-medium">EPS Growth %</label>
          <input
            value={epsGrowth}
            onChange={(e) => setEpsGrowth(e.target.value)}
            className="ui-input"
            placeholder="25"
            type="number"
            step="0.1"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Revenue Growth %</label>
          <input
            value={revenueGrowth}
            onChange={(e) => setRevenueGrowth(e.target.value)}
            className="ui-input"
            placeholder="25"
            type="number"
            step="0.1"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
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
          <label className="mb-1 block text-sm font-medium">Industry Group Rank</label>
          <input
            value={industryRank}
            onChange={(e) => setIndustryRank(e.target.value)}
            className="ui-input"
            placeholder="1-197"
            type="number"
            min="1"
            max="197"
            step="1"
          />
        </div>
          <div className="md:col-span-2">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={epsAccelerating}
              onChange={(e) => setEpsAccelerating(e.target.checked)}
              className="mt-1"
            />
            <span>EPS Accelerating</span>
          </label>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 p-4">
        <h3 className="text-sm font-semibold">Rule Confirmation</h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={trendTemplatePass}
              onChange={(e) => setTrendTemplatePass(e.target.checked)}
              className="mt-1"
            />
            <span>Trend Template passes all 8 criteria</span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={volumeDryUpPass}
              onChange={(e) => setVolumeDryUpPass(e.target.checked)}
              className="mt-1"
            />
            <span>Volume dry-up confirmed at pivot</span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={rsLineConfirmed}
              onChange={(e) => setRsLineConfirmed(e.target.checked)}
              className="mt-1"
            />
            <span>RS line confirmed</span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={basePatternValid}
              onChange={(e) => setBasePatternValid(e.target.checked)}
              className="mt-1"
            />
            <span>Base pattern valid</span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={entryNearPivot}
              onChange={(e) => setEntryNearPivot(e.target.checked)}
              className="mt-1"
            />
            <span>Entry near pivot</span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={volumeBreakoutConfirmed}
              onChange={(e) => setVolumeBreakoutConfirmed(e.target.checked)}
              className="mt-1"
            />
            <span>Volume breakout confirmed</span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={liquidityPass}
              onChange={(e) => setLiquidityPass(e.target.checked)}
              className="mt-1"
            />
            <span>Liquidity passes</span>
          </label>
                    <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={earningsWithin2Weeks}
              onChange={(e) => setEarningsWithin2Weeks(e.target.checked)}
              className="mt-1"
            />
            <span>Earnings within 2 weeks</span>
          </label>

          <label className="flex items-start gap-3 text-sm">
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

      <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <h3 className="text-sm font-semibold">Live Setup Preview</h3>

        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-neutral-500">Risk / Share</p>
            <p className="mt-1 text-lg font-semibold">
              {preview.riskPerShare ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Reward / Share</p>
            <p className="mt-1 text-lg font-semibold">
              {preview.rewardPerShare ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Expected R/R</p>
            <p
              className={[
                'mt-1 text-lg font-semibold',
                preview.expectedRR === null
                  ? 'text-neutral-900'
                  : preview.expectedRR >= 2
                    ? 'text-green-700'
                    : 'text-red-700',
              ].join(' ')}
            >
              {preview.expectedRR ?? '—'}
            </p>
          </div>
        </div>

        <p
          className={[
            'mt-3 text-sm font-medium',
            preview.expectedRR === null
              ? 'text-neutral-600'
              : preview.isValid
                ? 'text-green-700'
                : 'text-red-700',
          ].join(' ')}
        >
          {preview.expectedRR === null
            ? 'Enter entry, stop, and target values to preview setup quality.'
            : preview.isValid
              ? 'This setup passes the minimum R/R check.'
              : 'This setup does not meet the minimum R/R requirement.'}
        </p>
      </div>

      {errors.form ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errors.form}
        </div>
      ) : null}

      <div className="mt-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="ui-btn-primary"
        >
          {submitting ? 'Adding...' : 'Add to Watchlist'}
        </button>
      </div>
    </div>
  )
}