'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { evaluateSetup } from '@/lib/evaluateSetup'
import { generateTradePlan } from '@/lib/generateTradePlan'
import { MarketSummaryCards } from '@/components/MarketSummaryCards'
import { AddWatchlistStockForm } from '@/components/AddWatchlistStockForm'
import { WatchlistSelectionTable } from '@/components/WatchlistSelectionTable'
import { TradeActionButtons } from '@/components/TradeActionButtons'
import { EvaluationPanel } from '@/components/EvaluationPanel'
import { TradePlanPanel } from '@/components/TradePlanPanel'
import { SavedTradePlansTable } from '@/components/SavedTradePlansTable'
import { OpenTradesTable } from '@/components/OpenTradesTable'
import { MarketSnapshotForm } from '@/components/MarketSnapshotForm'

export type MarketSnapshot = {
  id: string
  market_phase: string
  max_long_exposure_pct: number | null
}

export type WatchlistRow = {
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

export type EvalResult = {
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

export type TradePlanResult = {
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

export type SavedTradePlan = {
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

export type SavedTrade = {
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
  const [latestTradePlanId, setLatestTradePlanId] = useState<string | null>(null)
  const [savedPlans, setSavedPlans] = useState<SavedTradePlan[]>([])
  const [savedTrades, setSavedTrades] = useState<SavedTrade[]>([])
  const [portfolioValue, setPortfolioValue] = useState('100000')

  const loadDashboardData = async () => {
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
    if (tradePlanError) console.error('Trade plan load error:', tradePlanError)
    if (tradeError) console.error('Trade load error:', tradeError)

    const watchlistRows = watchlistData ?? []

    setMarket(marketData ?? null)
    setWatchlist(watchlistRows)
    setStock((current) => {
      if (current) {
        const stillExists = watchlistRows.find((row) => row.id === current.id)
        if (stillExists) return stillExists
      }
      return watchlistRows[0] ?? null
    })
    setSavedPlans(tradePlanData ?? [])
    setSavedTrades(tradeData ?? [])
  }

  useEffect(() => {
    const load = async () => {
      await loadDashboardData()
      setLoading(false)
    }

    load()
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

  const handleSaveMarketSnapshot = async (payload: {
    snapshotDate: string
    marketPhase: string
    maxLongExposurePct: string
  }) => {
    const parsedExposure = Number(payload.maxLongExposurePct)

    if (!payload.snapshotDate) {
      alert('Snapshot date is required')
      return
    }

    if (!parsedExposure && parsedExposure !== 0) {
      alert('Enter a valid max long exposure')
      return
    }

    const { error } = await supabase.from('market_snapshots').upsert(
      {
        snapshot_date: payload.snapshotDate,
        market_phase: payload.marketPhase,
        max_long_exposure_pct: parsedExposure,
      },
      { onConflict: 'snapshot_date' }
    )

    if (error) {
      console.error(error)
      alert('Failed to save market snapshot')
      return
    }

    await loadDashboardData()
    alert('Market snapshot saved')
  }

  const handleAddWatchlistStock = async (payload: {
    ticker: string
    companyName: string
    setupGrade: string
    rrRatio: string
    entryZoneLow: string
    entryZoneHigh: string
    stopPrice: string
  }) => {
    if (!payload.ticker.trim()) {
      alert('Ticker is required')
      return
    }

    const { data: insertedRow, error } = await supabase
      .from('watchlist')
      .insert({
        ticker: payload.ticker.trim().toUpperCase(),
        company_name: payload.companyName.trim() || null,
        setup_type: 'breakout',
        setup_grade: payload.setupGrade,
        rr_ratio: payload.rrRatio ? Number(payload.rrRatio) : null,
        entry_zone_low: payload.entryZoneLow ? Number(payload.entryZoneLow) : null,
        entry_zone_high: payload.entryZoneHigh ? Number(payload.entryZoneHigh) : null,
        stop_price: payload.stopPrice ? Number(payload.stopPrice) : null,
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

        <MarketSummaryCards
          market={market}
          stock={stock}
          portfolioValue={portfolioValue}
          setPortfolioValue={setPortfolioValue}
        />

        <MarketSnapshotForm onSave={handleSaveMarketSnapshot} />

        <AddWatchlistStockForm onAdd={handleAddWatchlistStock} />

        <WatchlistSelectionTable
          watchlist={watchlist}
          stock={stock}
          onSelect={(row) => {
            setStock(row)
            setResult(null)
            setPlan(null)
            setLatestTradePlanId(null)
          }}
        />

        <TradeActionButtons
          canEvaluate={!!market && !!stock && !saving}
          canGenerate={!!market && !!stock}
          canCreate={!!stock && !!plan && !!latestTradePlanId}
          saving={saving}
          onEvaluate={runEvaluation}
          onGenerate={handleGenerateTradePlan}
          onCreateTrade={handleCreateTrade}
        />

        <EvaluationPanel result={result} />
        <TradePlanPanel plan={plan} />
        <SavedTradePlansTable savedPlans={savedPlans} />
        <OpenTradesTable savedTrades={savedTrades} />
      </section>
    </main>
  )
}