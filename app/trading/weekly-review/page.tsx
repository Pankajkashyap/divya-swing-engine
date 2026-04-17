'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/app/trading/lib/supabase'
import { WeeklyReviewSummary } from '@/app/trading/components/WeeklyReviewSummary'
import { AppHeader } from '@/app/trading/components/AppHeader'

type MarketSnapshot = {
  id: string
  market_phase: string
  max_long_exposure_pct: number | null
}

type TradeRow = {
  id: string
  ticker: string
  status: string
  pnl_dollar: number | null
  pnl_pct: number | null
  entry_date: string | null
  exit_date: string | null
  exit_price_actual: number | null
  shares_entered: number | null
  shares_exited: number | null
  entry_price_actual: number | null
  stop_price_current: number | null
}

export default function WeeklyReviewPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [trades, setTrades] = useState<TradeRow[]>([])
  const [primaryFocus, setPrimaryFocus] = useState('')
  const [biggestRuleIssue, setBiggestRuleIssue] = useState('')
  const [nextWeekTriggers, setNextWeekTriggers] = useState('')
  const [notes, setNotes] = useState('')
  const [spxDistributionDays, setSpxDistributionDays] = useState('')
  const [ndxDistributionDays, setNdxDistributionDays] = useState('')
  const [ftdActive, setFtdActive] = useState(false)
  const [phaseChanged, setPhaseChanged] = useState(false)
  const [priorPhase, setPriorPhase] = useState('')
  const [topSectors, setTopSectors] = useState('')
  const [deterioratingSectors, setDeteriorizatingSectors] = useState('')
  const [totalHeatPct, setTotalHeatPct] = useState('')
  const [drawdownFromHwmPct, setDrawdownFromHwmPct] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const [
        { data: marketData, error: marketError },
        { data: tradeData, error: tradeError },
      ] = await Promise.all([
        supabase
          .from('market_snapshots')
          .select('id, market_phase, max_long_exposure_pct')
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('trades')
          .select(
            'id, ticker, status, pnl_dollar, pnl_pct, entry_date, exit_date, exit_price_actual, shares_entered, shares_exited, entry_price_actual, stop_price_current'
          )
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      if (marketError) console.error('Market load error:', marketError)
      if (tradeError) console.error('Trade load error:', tradeError)

      setMarket(marketData ?? null)
      setTrades(tradeData ?? [])

      // Auto-calculate portfolio heat from open trades
      const openTrades = (tradeData ?? []).filter(
        (t) => t.status === 'open' || t.status === 'partial'
      )

      // Get portfolio value from user_settings
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('portfolio_value')
        .maybeSingle()

      const portfolioVal = Number(settingsData?.portfolio_value ?? 0)

      if (portfolioVal > 0) {
        let totalHeatDollar = 0
        for (const trade of openTrades) {
          const sharesHeld = Math.max(
            Number(trade.shares_entered ?? 0) - Number(trade.shares_exited ?? 0),
            0
          )
          const entryPrice = Number(trade.entry_price_actual ?? 0)
          const stopPrice = Number(trade.stop_price_current ?? 0)
          if (stopPrice <= entryPrice) {
            totalHeatDollar += (entryPrice - stopPrice) * sharesHeld
          }
        }
        const computedHeat = Number(((totalHeatDollar / portfolioVal) * 100).toFixed(1))
        setTotalHeatPct(String(computedHeat))
      }

      setLoading(false)
    }

    void loadData()
  }, [supabase])

  const metrics = useMemo(() => {
    const openTrades = trades.filter(
      (trade) => trade.status === 'open' || trade.status === 'partial'
    )

    const closedTrades = trades.filter((trade) => trade.status === 'closed')

    const totalRealizedPnl = closedTrades.reduce(
      (sum, trade) => sum + (trade.pnl_dollar ?? 0),
      0
    )

    const wins = closedTrades.filter((trade) => (trade.pnl_dollar ?? 0) > 0)
    const losses = closedTrades.filter((trade) => (trade.pnl_dollar ?? 0) < 0)

    const avgWin =
      wins.length > 0
        ? wins.reduce((sum, trade) => sum + (trade.pnl_dollar ?? 0), 0) /
          wins.length
        : 0

    const avgLoss =
      losses.length > 0
        ? losses.reduce((sum, trade) => sum + (trade.pnl_dollar ?? 0), 0) /
          losses.length
        : 0

    return {
      openTradesCount: openTrades.length,
      closedTradesCount: closedTrades.length,
      totalRealizedPnl: Number(totalRealizedPnl.toFixed(2)),
      winsCount: wins.length,
      lossesCount: losses.length,
      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLoss.toFixed(2)),
      closedTrades,
    }
  }, [trades])

  const handleSaveWeeklyReview = async () => {
    const today = new Date().toISOString().slice(0, 10)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase.from('weekly_reviews').upsert(
      {
        user_id: user.id,
        week_ending: today,
        market_phase: market?.market_phase ?? null,
        open_positions_count: metrics.openTradesCount,
        wins_count: metrics.winsCount,
        losses_count: metrics.lossesCount,
        weekly_pnl_dollar: metrics.totalRealizedPnl,
        avg_win_r: metrics.avgWin,
        avg_loss_r: metrics.avgLoss,
        biggest_rule_violation: biggestRuleIssue || null,
        next_week_triggers: nextWeekTriggers || null,
        primary_focus: primaryFocus || null,
        notes: notes || null,
        spx_distribution_days: spxDistributionDays ? Number(spxDistributionDays) : null,
        ndx_distribution_days: ndxDistributionDays ? Number(ndxDistributionDays) : null,
        ftd_active: ftdActive,
        phase_changed: phaseChanged,
        prior_phase: priorPhase || null,
        current_phase: market?.market_phase ?? null,
        top_sectors: topSectors || null,
        deteriorating_sectors: deterioratingSectors || null,
        total_heat_pct: totalHeatPct ? Number(totalHeatPct) : null,
        heat_ceiling_pct: market?.max_long_exposure_pct ?? null,
        drawdown_from_hwm_pct: drawdownFromHwmPct ? Number(drawdownFromHwmPct) : null,
      },
      { onConflict: 'week_ending' }
    )

    if (error) {
      console.error(error)
      alert('Failed to save weekly review')
      return
    }

    setPrimaryFocus('')
    setBiggestRuleIssue('')
    setNextWeekTriggers('')
    setNotes('')
    setSpxDistributionDays('')
    setNdxDistributionDays('')
    setFtdActive(false)
    setPhaseChanged(false)
    setPriorPhase('')
    setTopSectors('')
    setDeteriorizatingSectors('')
    setDrawdownFromHwmPct('')

    alert('Weekly review saved')
  }

  if (loading) {
    return <main className="ui-page">Loading weekly review...</main>
  }

  return (
    <main className="ui-page">
      <section className="mx-auto max-w-7xl">
        <AppHeader
          title="Weekly Review"
        />

        <WeeklyReviewSummary
          marketPhase={market?.market_phase ?? ''}
          openTradesCount={metrics.openTradesCount}
          closedTradesCount={metrics.closedTradesCount}
          totalRealizedPnl={metrics.totalRealizedPnl}
          winsCount={metrics.winsCount}
          lossesCount={metrics.lossesCount}
          avgWin={metrics.avgWin}
          avgLoss={metrics.avgLoss}
        />

        <div className="ui-section mt-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            Closed Trades
          </h2>

          {metrics.closedTrades.length === 0 ? (
            <p className="mt-4 text-neutral-600 dark:text-[#a8b2bf]">
              No closed trades yet.
            </p>
          ) : (
            <div className="mt-4 ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Entry Date</th>
                    <th>Exit Date</th>
                    <th>Exit Price</th>
                    <th>P&amp;L $</th>
                    <th>P&amp;L %</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.closedTrades.map((trade) => (
                    <tr key={trade.id}>
                      <td className="py-3 pr-4 font-medium text-neutral-900 dark:text-[#e6eaf0]">
                        {trade.ticker}
                      </td>
                      <td className="py-3 pr-4">{trade.entry_date ?? '—'}</td>
                      <td className="py-3 pr-4">{trade.exit_date ?? '—'}</td>
                      <td className="py-3 pr-4">
                        {trade.exit_price_actual ?? '—'}
                      </td>
                      <td className="py-3 pr-4">{trade.pnl_dollar ?? '—'}</td>
                      <td className="py-3 pr-4">{trade.pnl_pct ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="ui-section mt-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            Weekly Review Notes
          </h2>

          <div className="mt-4 grid gap-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Market Conditions
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  SPX Distribution Days
                </label>
                <input
                  type="number"
                  step="1"
                  value={spxDistributionDays}
                  onChange={(e) => setSpxDistributionDays(e.target.value)}
                  className="ui-input"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  NDX Distribution Days
                </label>
                <input
                  type="number"
                  step="1"
                  value={ndxDistributionDays}
                  onChange={(e) => setNdxDistributionDays(e.target.value)}
                  className="ui-input"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-neutral-900 dark:text-[#e6eaf0]">
                <input
                  type="checkbox"
                  checked={ftdActive}
                  onChange={(e) => setFtdActive(e.target.checked)}
                  className="h-4 w-4"
                />
                Follow-Through Day active
              </label>

              <label className="flex items-center gap-2 text-sm text-neutral-900 dark:text-[#e6eaf0]">
                <input
                  type="checkbox"
                  checked={phaseChanged}
                  onChange={(e) => setPhaseChanged(e.target.checked)}
                  className="h-4 w-4"
                />
                Market phase changed this week
              </label>
            </div>

            {phaseChanged ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Prior phase
                </label>
                <select
                  value={priorPhase}
                  onChange={(e) => setPriorPhase(e.target.value)}
                  className="ui-select"
                >
                  <option value="">Select...</option>
                  <option value="confirmed_uptrend">Confirmed Uptrend</option>
                  <option value="under_pressure">Under Pressure</option>
                  <option value="rally_attempt">Rally Attempt</option>
                  <option value="correction">Correction</option>
                  <option value="bear">Bear</option>
                </select>
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Top sectors this week
              </label>
              <input
                value={topSectors}
                onChange={(e) => setTopSectors(e.target.value)}
                className="ui-input"
                placeholder="e.g. Technology, Healthcare"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Deteriorating sectors
              </label>
              <input
                value={deterioratingSectors}
                onChange={(e) => setDeteriorizatingSectors(e.target.value)}
                className="ui-input"
                placeholder="e.g. Energy, Financials"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Portfolio State
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="ui-card p-4">
                <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">Portfolio Heat %</div>
                <div className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  {totalHeatPct || '—'}%
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">Auto-calculated</p>
              </div>

              <div className="ui-card p-4">
                <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">Heat Ceiling %</div>
                <div className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  {market?.max_long_exposure_pct ?? '—'}%
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">From market snapshot</p>
              </div>

              <div className="ui-card p-4">
                <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">Open Positions</div>
                <div className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  {metrics.openTradesCount}
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">Auto-calculated</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Drawdown from high-water mark (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={drawdownFromHwmPct}
                onChange={(e) => setDrawdownFromHwmPct(e.target.value)}
                className="ui-input"
                placeholder="0.0"
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                Enter manually from your account statement
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Primary Focus for Next Week
              </label>
              <input
                value={primaryFocus}
                onChange={(e) => setPrimaryFocus(e.target.value)}
                className="ui-input"
                placeholder="Focus on A-grade setups only"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Biggest Rule Issue
              </label>
              <input
                value={biggestRuleIssue}
                onChange={(e) => setBiggestRuleIssue(e.target.value)}
                className="ui-input"
                placeholder="Entered too far from pivot"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Next Week Triggers
              </label>
              <input
                value={nextWeekTriggers}
                onChange={(e) => setNextWeekTriggers(e.target.value)}
                className="ui-input"
                placeholder="Watch for confirmed_uptrend continuation"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="ui-textarea min-h-32"
                placeholder="Weekly reflection..."
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleSaveWeeklyReview}
              className="ui-btn-primary"
            >
              Save Weekly Review
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}