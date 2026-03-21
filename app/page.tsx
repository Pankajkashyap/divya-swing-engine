'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { evaluateSetup } from '@/lib/evaluateSetup'
import { generateTradePlan } from '@/lib/generateTradePlan'

type MarketSnapshot = {
  id: string
  market_phase: string
  max_long_exposure_pct: number | null
}

type WatchlistRow = {
  id: string
  ticker: string
  company_name: string | null
  setup_grade: string | null
  trend_template_pass: boolean | null
  volume_dry_up_pass: boolean | null
  rr_ratio: number | null
  earnings_within_2_weeks: boolean | null
  binary_event_risk: boolean | null
  pivot_price: number | null
  entry_zone_low: number | null
  entry_zone_high: number | null
  stop_price: number | null
  target_1_price: number | null
  target_2_price: number | null
}

type EvalResult = {
  id: string | null
  verdict: 'pass' | 'watch' | 'fail'
  score_total: number
  fail_reason: string | null
  notes: string | null
  market_phase_pass: boolean
  trend_template_pass: boolean
  liquidity_pass: boolean
  base_pattern_valid: boolean
  volume_pattern_valid: boolean
  rs_line_confirmed: boolean
  entry_near_pivot_pass: boolean
  volume_breakout_pass: boolean
  earnings_risk_flag: boolean
  binary_event_flag: boolean
  rr_pass: boolean
  rr_ratio: number | null
  setup_grade: string | null
}

type TradePlanResult = {
  risk_pct: number
  dollar_risk: number
  entry_price: number
  stop_price: number
  risk_per_share: number
  planned_shares: number
  position_value: number
  final_shares: number
  final_position_value: number
  expected_rr: number
  approval_status: 'approved' | 'blocked'
  blocked_reason: string | null
}

type SavedTradePlan = {
  id: string
  plan_date: string
  side: string
  entry_price: number | null
  stop_price: number | null
  final_shares: number | null
  final_position_value: number | null
  expected_rr: number | null
  approval_status: string
  blocked_reason: string | null
}

type SavedTrade = {
  id: string
  ticker: string
  side: string
  status: string
  entry_date: string | null
  entry_price_actual: number | null
  shares_entered: number | null
  stop_price_initial: number | null
  target_1_price: number | null
  target_2_price: number | null
}

export default function HomePage() {
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [stock, setStock] = useState<WatchlistRow | null>(null)
  const [watchlist, setWatchlist] = useState<WatchlistRow[]>([])
  const [result, setResult] = useState<EvalResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<TradePlanResult | null>(null)
  const [latestTradePlanId, setLatestTradePlanId] = useState<string | null>(
    null
  )
  const [savedPlans, setSavedPlans] = useState<SavedTradePlan[]>([])
  const [savedTrades, setSavedTrades] = useState<SavedTrade[]>([])

  const [newTicker, setNewTicker] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newSetupGrade, setNewSetupGrade] = useState('A')
  const [newRrRatio, setNewRrRatio] = useState('')
  const [newEntryZoneLow, setNewEntryZoneLow] = useState('')
  const [newEntryZoneHigh, setNewEntryZoneHigh] = useState('')
  const [newStopPrice, setNewStopPrice] = useState('')
  const [portfolioValue, setPortfolioValue] = useState('100000')

  useEffect(() => {
    const loadData = async () => {
      const [
        { data: marketData, error: marketError },
        { data: watchlistData, error: watchlistError },
        { data: tradePlanData, error: tradePlanError },
        { data: tradeData, error: tradeError },
      ] = await Promise.all([
        supabase
          .from('market_snapshots')
          .select('id, market_phase, max_long_exposure_pct')
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('watchlist')
          .select(
            'id, ticker, company_name, setup_grade, trend_template_pass, volume_dry_up_pass, rr_ratio, earnings_within_2_weeks, binary_event_risk, pivot_price, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price'
          )
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('trade_plans')
          .select(
            'id, plan_date, side, entry_price, stop_price, final_shares, final_position_value, expected_rr, approval_status, blocked_reason'
          )
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('trades')
          .select(
            'id, ticker, side, status, entry_date, entry_price_actual, shares_entered, stop_price_initial, target_1_price, target_2_price'
          )
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (marketError) console.error('Market load error:', marketError)
      if (watchlistError) console.error('Watchlist load error:', watchlistError)
      if (tradePlanError)
        console.error('Trade plan load error:', tradePlanError)
      if (tradeError) console.error('Trade load error:', tradeError)

      const watchlistRows = watchlistData ?? []

      setMarket(marketData ?? null)
      setWatchlist(watchlistRows)
      setStock(watchlistRows[0] ?? null)
      setSavedPlans(tradePlanData ?? [])
      setSavedTrades(tradeData ?? [])
      setLoading(false)
    }

    loadData()
  }, [])

  const runEvaluation = async () => {
    if (!market || !stock) return

    setSaving(true)

    const evaluation = evaluateSetup(market, stock)

    const { data: savedEvaluation, error } = await supabase
      .from('setup_evaluations')
      .insert({
        watchlist_id: stock.id,
        evaluation_date: new Date().toISOString().slice(0, 10),
        market_phase_pass: evaluation.market_phase_pass,
        trend_template_pass: evaluation.trend_template_pass,
        liquidity_pass: evaluation.liquidity_pass,
        base_pattern_valid: evaluation.base_pattern_valid,
        volume_pattern_valid: evaluation.volume_pattern_valid,
        rs_line_confirmed: evaluation.rs_line_confirmed,
        entry_near_pivot_pass: evaluation.entry_near_pivot_pass,
        volume_breakout_pass: evaluation.volume_breakout_pass,
        earnings_risk_flag: evaluation.earnings_risk_flag,
        binary_event_flag: evaluation.binary_event_flag,
        rr_pass: evaluation.rr_pass,
        rr_ratio: evaluation.rr_ratio,
        setup_grade: evaluation.setup_grade,
        score_total: evaluation.score_total,
        verdict: evaluation.verdict,
        fail_reason: evaluation.fail_reason,
        notes: evaluation.notes,
      })
      .select('id')
      .single()

    if (error) {
      console.error(error)
      alert('Failed to save evaluation')
      setSaving(false)
      return
    }

    setResult({
      id: savedEvaluation?.id ?? null,
      verdict: evaluation.verdict,
      score_total: evaluation.score_total,
      fail_reason: evaluation.fail_reason,
      notes: evaluation.notes,
      market_phase_pass: evaluation.market_phase_pass,
      trend_template_pass: evaluation.trend_template_pass,
      liquidity_pass: evaluation.liquidity_pass,
      base_pattern_valid: evaluation.base_pattern_valid,
      volume_pattern_valid: evaluation.volume_pattern_valid,
      rs_line_confirmed: evaluation.rs_line_confirmed,
      entry_near_pivot_pass: evaluation.entry_near_pivot_pass,
      volume_breakout_pass: evaluation.volume_breakout_pass,
      earnings_risk_flag: evaluation.earnings_risk_flag,
      binary_event_flag: evaluation.binary_event_flag,
      rr_pass: evaluation.rr_pass,
      rr_ratio: evaluation.rr_ratio,
      setup_grade: evaluation.setup_grade,
    })

    setSaving(false)
  }

  const handleAddWatchlistStock = async () => {
    if (!newTicker.trim()) {
      alert('Ticker is required')
      return
    }

    const { data: insertedRow, error } = await supabase
      .from('watchlist')
      .insert({
        ticker: newTicker.trim().toUpperCase(),
        company_name: newCompanyName.trim() || null,
        setup_type: 'breakout',
        setup_grade: newSetupGrade,
        rr_ratio: newRrRatio ? Number(newRrRatio) : null,
        entry_zone_low: newEntryZoneLow ? Number(newEntryZoneLow) : null,
        entry_zone_high: newEntryZoneHigh ? Number(newEntryZoneHigh) : null,
        stop_price: newStopPrice ? Number(newStopPrice) : null,
        trend_template_pass: true,
        volume_dry_up_pass: true,
        status: 'watchlist',
        action_status: 'watchlist',
      })
      .select(
        'id, ticker, company_name, setup_grade, trend_template_pass, volume_dry_up_pass, rr_ratio, earnings_within_2_weeks, binary_event_risk, pivot_price, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price'
      )
      .single()

    if (error) {
      console.error(error)
      alert('Failed to add watchlist stock')
      return
    }

    const updatedWatchlist = [insertedRow, ...watchlist]
    setWatchlist(updatedWatchlist)
    setStock(insertedRow)

    setNewTicker('')
    setNewCompanyName('')
    setNewSetupGrade('A')
    setNewRrRatio('')
    setNewEntryZoneLow('')
    setNewEntryZoneHigh('')
    setNewStopPrice('')
    setResult(null)
    setPlan(null)
    setLatestTradePlanId(null)
  }

  const handleGenerateTradePlan = async () => {
    if (!market || !stock) return

    const parsedPortfolioValue = Number(portfolioValue)

    if (!parsedPortfolioValue || parsedPortfolioValue <= 0) {
      alert('Enter a valid portfolio value')
      return
    }

    const tradePlan = generateTradePlan(market, stock, parsedPortfolioValue)

    const { data: savedTradePlan, error } = await supabase
      .from('trade_plans')
      .insert({
        watchlist_id: stock.id,
        plan_date: new Date().toISOString().slice(0, 10),
        side: 'long',
        portfolio_value: parsedPortfolioValue,
        risk_pct: tradePlan.risk_pct,
        dollar_risk: tradePlan.dollar_risk,
        entry_price: tradePlan.entry_price,
        stop_price: tradePlan.stop_price,
        risk_per_share: tradePlan.risk_per_share,
        planned_shares: tradePlan.planned_shares,
        position_value: tradePlan.position_value,
        final_shares: tradePlan.final_shares,
        final_position_value: tradePlan.final_position_value,
        expected_rr: tradePlan.expected_rr,
        approval_status: tradePlan.approval_status,
        blocked_reason: tradePlan.blocked_reason,
      })
      .select('id')
      .single()

    if (error) {
      console.error(error)
      alert('Failed to save trade plan')
      return
    }

    setPlan(tradePlan)
    setLatestTradePlanId(savedTradePlan?.id ?? null)

    const { data: refreshedPlans } = await supabase
      .from('trade_plans')
      .select(
        'id, plan_date, side, entry_price, stop_price, final_shares, final_position_value, expected_rr, approval_status, blocked_reason'
      )
      .order('created_at', { ascending: false })
      .limit(10)

    setSavedPlans(refreshedPlans ?? [])
  }

  const handleCreateTrade = async () => {
    if (!stock || !plan || !latestTradePlanId) {
      alert('Generate a trade plan first')
      return
    }

    if (plan.approval_status !== 'approved') {
      alert('Only approved trade plans can create trades')
      return
    }

    const { error } = await supabase.from('trades').insert({
      trade_plan_id: latestTradePlanId,
      ticker: stock.ticker,
      side: 'long',
      status: 'open',
      entry_date: new Date().toISOString().slice(0, 10),
      entry_price_actual: plan.entry_price,
      shares_entered: plan.final_shares,
      stop_price_initial: plan.stop_price,
      stop_price_current: plan.stop_price,
      target_1_price: stock.target_1_price,
      target_2_price: stock.target_2_price,
      thesis_intact: true,
      notes: 'Created from approved trade plan',
    })

    if (error) {
      console.error(error)
      alert('Failed to create trade')
      return
    }

    await supabase
      .from('trade_plans')
      .update({ approval_status: 'executed' })
      .eq('id', latestTradePlanId)

    const [{ data: refreshedTrades }, { data: refreshedPlans }] =
      await Promise.all([
        supabase
          .from('trades')
          .select(
            'id, ticker, side, status, entry_date, entry_price_actual, shares_entered, stop_price_initial, target_1_price, target_2_price'
          )
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('trade_plans')
          .select(
            'id, plan_date, side, entry_price, stop_price, final_shares, final_position_value, expected_rr, approval_status, blocked_reason'
          )
          .order('created_at', { ascending: false })
          .limit(10),
      ])

    setSavedTrades(refreshedTrades ?? [])
    setSavedPlans(refreshedPlans ?? [])
    alert('Trade created successfully')
  }

  if (loading) {
    return <main className="p-10">Loading...</main>
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          Divya Swing Engine
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Setup Evaluator
        </h1>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-lg font-semibold">Market</h2>
            <p className="mt-3 text-sm text-neutral-600">Current phase</p>
            <p className="text-2xl font-semibold">
              {market?.market_phase ?? '—'}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-lg font-semibold">Candidate</h2>
            <p className="mt-3 text-sm text-neutral-600">
              {stock?.ticker} — {stock?.company_name ?? '—'}
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Grade: {stock?.setup_grade ?? '—'} | R/R: {stock?.rr_ratio ?? '—'}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-lg font-semibold">Portfolio Value</h2>
            <p className="mt-3 text-sm text-neutral-600">
              Used for trade sizing
            </p>
            <input
              value={portfolioValue}
              onChange={(e) => setPortfolioValue(e.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="100000"
            />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
          <h2 className="text-lg font-semibold">Add Watchlist Stock</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Ticker</label>
              <input
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="NVDA"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Company Name
              </label>
              <input
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="NVIDIA Corp."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Setup Grade
              </label>
              <select
                value={newSetupGrade}
                onChange={(e) => setNewSetupGrade(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">R/R Ratio</label>
              <input
                value={newRrRatio}
                onChange={(e) => setNewRrRatio(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="2.5"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Entry Zone Low
              </label>
              <input
                value={newEntryZoneLow}
                onChange={(e) => setNewEntryZoneLow(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Entry Zone High
              </label>
              <input
                value={newEntryZoneHigh}
                onChange={(e) => setNewEntryZoneHigh(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="105"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Stop Price</label>
              <input
                value={newStopPrice}
                onChange={(e) => setNewStopPrice(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="95"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleAddWatchlistStock}
              className="rounded-xl border border-neutral-900 px-5 py-3 text-sm font-medium"
            >
              Add to Watchlist
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Watchlist Selection</h2>
            <p className="text-sm text-neutral-500">{watchlist.length} records</p>
          </div>

          {watchlist.length === 0 ? (
            <p className="text-neutral-600">No watchlist names available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-3 pr-4">Select</th>
                    <th className="py-3 pr-4">Ticker</th>
                    <th className="py-3 pr-4">Company</th>
                    <th className="py-3 pr-4">Grade</th>
                    <th className="py-3 pr-4">R/R</th>
                    <th className="py-3 pr-4">Entry Zone</th>
                    <th className="py-3 pr-4">Stop</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map((row) => {
                    const isSelected = stock?.id === row.id

                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-neutral-100 ${isSelected ? 'bg-neutral-50' : ''}`}
                      >
                        <td className="py-3 pr-4">
                          <button
                            onClick={() => {
                              setStock(row)
                              setResult(null)
                              setPlan(null)
                              setLatestTradePlanId(null)
                            }}
                            className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium"
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </td>
                        <td className="py-3 pr-4 font-medium">{row.ticker}</td>
                        <td className="py-3 pr-4">{row.company_name ?? '—'}</td>
                        <td className="py-3 pr-4">{row.setup_grade ?? '—'}</td>
                        <td className="py-3 pr-4">{row.rr_ratio ?? '—'}</td>
                        <td className="py-3 pr-4">
                          {row.entry_zone_low ?? '—'} -{' '}
                          {row.entry_zone_high ?? '—'}
                        </td>
                        <td className="py-3 pr-4">{row.stop_price ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={runEvaluation}
            disabled={!market || !stock || saving}
            className="rounded-xl border border-neutral-900 px-5 py-3 text-sm font-medium"
          >
            {saving ? 'Evaluating...' : 'Evaluate Setup'}
          </button>

          <button
            onClick={handleGenerateTradePlan}
            disabled={!market || !stock}
            className="rounded-xl border border-neutral-900 px-5 py-3 text-sm font-medium"
          >
            Generate Trade Plan
          </button>

          <button
            onClick={handleCreateTrade}
            disabled={!stock || !plan || !latestTradePlanId}
            className="rounded-xl border border-neutral-900 px-5 py-3 text-sm font-medium"
          >
            Create Trade
          </button>
        </div>

        {result && (
          <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-lg font-semibold">Evaluation Result</h2>
            <p className="mt-3 text-sm text-neutral-500">
              Saved evaluation ID: {result.id ?? '—'}
            </p>
            <p className="mt-2">
              <span className="font-medium">Verdict:</span> {result.verdict}
            </p>
            <p className="mt-2">
              <span className="font-medium">Score:</span> {result.score_total}
            </p>
            <p className="mt-2">
              <span className="font-medium">Decision reason:</span>{' '}
              {result.fail_reason ?? result.notes ?? '—'}
            </p>
            <p className="mt-2">
              <span className="font-medium">Notes:</span> {result.notes ?? '—'}
            </p>

            <div className="mt-6">
              <h3 className="text-base font-semibold">Rule Breakdown</h3>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-neutral-500">
                      <th className="py-3 pr-4">Rule</th>
                      <th className="py-3 pr-4">Result</th>
                      <th className="py-3 pr-4">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">Market Phase</td>
                      <td className="py-3 pr-4">
                        {result.market_phase_pass ? 'Pass' : 'Fail'}
                      </td>
                      <td className="py-3 pr-4">
                        Current market must allow new long entries
                      </td>
                    </tr>

                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">Trend Template</td>
                      <td className="py-3 pr-4">
                        {result.trend_template_pass ? 'Pass' : 'Fail'}
                      </td>
                      <td className="py-3 pr-4">
                        Stock must satisfy the trend template gate
                      </td>
                    </tr>

                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">Liquidity</td>
                      <td className="py-3 pr-4">
                        {result.liquidity_pass ? 'Pass' : 'Fail'}
                      </td>
                      <td className="py-3 pr-4">
                        Liquidity gate for trade execution quality
                      </td>
                    </tr>

                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">Base Pattern</td>
                      <td className="py-3 pr-4">
                        {result.base_pattern_valid ? 'Pass' : 'Fail'}
                      </td>
                      <td className="py-3 pr-4">
                        Pattern structure must be valid
                      </td>
                    </tr>

                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">Volume Pattern</td>
                      <td className="py-3 pr-4">
                        {result.volume_pattern_valid ? 'Pass' : 'Fail'}
                      </td>
                      <td className="py-3 pr-4">
                        Dry-up / constructive volume behavior required
                      </td>
                    </tr>

                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">RS Confirmation</td>
                      <td className="py-3 pr-4">
                        {result.rs_line_confirmed ? 'Pass' : 'Fail'}
                      </td>
                      <td className="py-3 pr-4">
                        Relative strength should confirm leadership
                      </td>
                    </tr>

                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">Entry Near Pivot</td>
                      <td className="py-3 pr-4">
                        {result.entry_near_pivot_pass ? 'Pass' : 'Fail'}
                      </td>
                      <td className="py-3 pr-4">
                        Entry should be near the intended pivot / entry zone
                      </td>
                    </tr>

                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">Breakout Volume</td>
                      <td className="py-3 pr-4">
                        {result.volume_breakout_pass ? 'Pass' : 'Fail'}
                      </td>
                      <td className="py-3 pr-4">
                        Breakout should have enough volume confirmation
                      </td>
                    </tr>

                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">Reward / Risk</td>
                      <td className="py-3 pr-4">
                        {result.rr_pass ? 'Pass' : 'Fail'}
                      </td>
                      <td className="py-3 pr-4">
                        Current R/R: {result.rr_ratio ?? '—'}
                      </td>
                    </tr>

                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">Setup Grade</td>
                      <td className="py-3 pr-4">{result.setup_grade ?? '—'}</td>
                      <td className="py-3 pr-4">
                        Quality grade influences aggressiveness and sizing
                      </td>
                    </tr>

                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">Earnings Risk</td>
                      <td className="py-3 pr-4">
                        {result.earnings_risk_flag ? 'Flagged' : 'Clear'}
                      </td>
                      <td className="py-3 pr-4">
                        Earnings inside 2 weeks should reduce aggressiveness
                      </td>
                    </tr>

                    <tr className="border-b border-neutral-100">
                      <td className="py-3 pr-4">Binary Event Risk</td>
                      <td className="py-3 pr-4">
                        {result.binary_event_flag ? 'Flagged' : 'Clear'}
                      </td>
                      <td className="py-3 pr-4">
                        Binary event risk should reduce size or delay entry
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {plan && (
          <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-lg font-semibold">Trade Plan</h2>
            <p className="mt-3">
              <span className="font-medium">Risk %:</span> {plan.risk_pct}
            </p>
            <p className="mt-2">
              <span className="font-medium">Dollar Risk:</span>{' '}
              {plan.dollar_risk}
            </p>
            <p className="mt-2">
              <span className="font-medium">Entry:</span> {plan.entry_price}
            </p>
            <p className="mt-2">
              <span className="font-medium">Stop:</span> {plan.stop_price}
            </p>
            <p className="mt-2">
              <span className="font-medium">Risk / Share:</span>{' '}
              {plan.risk_per_share}
            </p>
            <p className="mt-2">
              <span className="font-medium">Planned Shares:</span>{' '}
              {plan.planned_shares}
            </p>
            <p className="mt-2">
              <span className="font-medium">Final Shares:</span>{' '}
              {plan.final_shares}
            </p>
            <p className="mt-2">
              <span className="font-medium">Final Position Value:</span>{' '}
              {plan.final_position_value}
            </p>
            <p className="mt-2">
              <span className="font-medium">Expected R/R:</span>{' '}
              {plan.expected_rr}
            </p>
            <p className="mt-2">
              <span className="font-medium">Status:</span>{' '}
              {plan.approval_status}
            </p>
            <p className="mt-2">
              <span className="font-medium">Blocked reason:</span>{' '}
              {plan.blocked_reason ?? '—'}
            </p>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Saved Trade Plans</h2>
            <p className="text-sm text-neutral-500">{savedPlans.length} records</p>
          </div>

          {savedPlans.length === 0 ? (
            <p className="text-neutral-600">No saved trade plans yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-3 pr-4">Plan Date</th>
                    <th className="py-3 pr-4">Side</th>
                    <th className="py-3 pr-4">Entry</th>
                    <th className="py-3 pr-4">Stop</th>
                    <th className="py-3 pr-4">Shares</th>
                    <th className="py-3 pr-4">Position Value</th>
                    <th className="py-3 pr-4">Expected R/R</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Blocked Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {savedPlans.map((row) => (
                    <tr key={row.id} className="border-b border-neutral-100">
                      <td className="py-3 pr-4">{row.plan_date}</td>
                      <td className="py-3 pr-4">{row.side}</td>
                      <td className="py-3 pr-4">{row.entry_price ?? '—'}</td>
                      <td className="py-3 pr-4">{row.stop_price ?? '—'}</td>
                      <td className="py-3 pr-4">{row.final_shares ?? '—'}</td>
                      <td className="py-3 pr-4">
                        {row.final_position_value ?? '—'}
                      </td>
                      <td className="py-3 pr-4">{row.expected_rr ?? '—'}</td>
                      <td className="py-3 pr-4">{row.approval_status}</td>
                      <td className="py-3 pr-4">{row.blocked_reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Open Trades</h2>
            <p className="text-sm text-neutral-500">{savedTrades.length} records</p>
          </div>

          {savedTrades.length === 0 ? (
            <p className="text-neutral-600">No trades created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-3 pr-4">Ticker</th>
                    <th className="py-3 pr-4">Side</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Entry Date</th>
                    <th className="py-3 pr-4">Entry Price</th>
                    <th className="py-3 pr-4">Shares</th>
                    <th className="py-3 pr-4">Initial Stop</th>
                    <th className="py-3 pr-4">Target 1</th>
                    <th className="py-3 pr-4">Target 2</th>
                  </tr>
                </thead>
                <tbody>
                  {savedTrades.map((row) => (
                    <tr key={row.id} className="border-b border-neutral-100">
                      <td className="py-3 pr-4 font-medium">{row.ticker}</td>
                      <td className="py-3 pr-4">{row.side}</td>
                      <td className="py-3 pr-4">{row.status}</td>
                      <td className="py-3 pr-4">{row.entry_date ?? '—'}</td>
                      <td className="py-3 pr-4">
                        {row.entry_price_actual ?? '—'}
                      </td>
                      <td className="py-3 pr-4">{row.shares_entered ?? '—'}</td>
                      <td className="py-3 pr-4">
                        {row.stop_price_initial ?? '—'}
                      </td>
                      <td className="py-3 pr-4">{row.target_1_price ?? '—'}</td>
                      <td className="py-3 pr-4">{row.target_2_price ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}