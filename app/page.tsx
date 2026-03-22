'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { evaluateSetup } from '@/lib/evaluateSetup'
import { generateTradePlan } from '@/lib/generateTradePlan'
import { calculateExposure } from '@/lib/calculateExposure'
import { AppHeader } from '@/components/AppHeader'
import { DashboardMetrics } from '@/components/DashboardMetrics'
import { PortfolioHeatCard } from '@/components/PortfolioHeatCard'
import { MarketSummaryCards } from '@/components/MarketSummaryCards'
import { AddWatchlistStockForm } from '@/components/AddWatchlistStockForm'
import { WatchlistSelectionTable } from '@/components/WatchlistSelectionTable'
import { TradeActionButtons } from '@/components/TradeActionButtons'
import { EvaluationPanel } from '@/components/EvaluationPanel'
import { TradePlanPanel } from '@/components/TradePlanPanel'
import { SavedTradePlansTable } from '@/components/SavedTradePlansTable'
import { MarketSnapshotForm } from '@/components/MarketSnapshotForm'
import { TradeManagementTable } from '@/components/TradeManagementTable'
import { RuleAuditTable } from '@/components/RuleAuditTable'
import { StopUpdateTable } from '@/components/StopUpdateTable'
import { PartialExitTable } from '@/components/PartialExitTable'
import { ExposurePreviewPanel } from '@/components/ExposurePreviewPanel'

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
  rs_line_confirmed: boolean | null
  base_pattern_valid: boolean | null
  entry_near_pivot: boolean | null
  volume_breakout_confirmed: boolean | null
  liquidity_pass: boolean | null
  eps_growth_pct: number | null
  eps_accelerating: boolean | null
  revenue_growth_pct: number | null
  acc_dist_rating: string | null
  industry_group_rank: number | null
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
  setup_grade: string | null
  fundamental_pass: boolean
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
  stop_price_current: number | null
  target_1_price: number | null
  target_2_price: number | null
  exit_date: string | null
  exit_price_actual: number | null
  pnl_dollar: number | null
  pnl_pct: number | null
}

type RuleAuditRow = {
  id: string
  setup_evaluation_id: string
  rule_code: string
  rule_name: string
  passed: boolean | null
  actual_value_text: string | null
  actual_value_numeric: number | null
  notes: string | null
}

type TradeCreationMessage = {
  type: 'success' | 'error' | 'info'
  text: string
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
  const [ruleAuditRows, setRuleAuditRows] = useState<RuleAuditRow[]>([])
  const [portfolioValue, setPortfolioValue] = useState('100000')
  const [tradeCreationMessage, setTradeCreationMessage] =
    useState<TradeCreationMessage | null>(null)

  const loadDashboardData = async () => {
    const [
      { data: marketData, error: marketError },
      { data: watchlistData, error: watchlistError },
      { data: tradePlanData, error: tradePlanError },
      { data: tradeData, error: tradeError },
      { data: ruleAuditData, error: ruleAuditError },
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
          'id, ticker, company_name, setup_grade, trend_template_pass, volume_dry_up_pass, rr_ratio, earnings_within_2_weeks, binary_event_risk, pivot_price, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price, rs_line_confirmed, base_pattern_valid, entry_near_pivot, volume_breakout_confirmed, liquidity_pass, eps_growth_pct, eps_accelerating, revenue_growth_pct, acc_dist_rating, industry_group_rank'
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
          'id, ticker, side, status, entry_date, entry_price_actual, shares_entered, stop_price_initial, stop_price_current, target_1_price, target_2_price, exit_date, exit_price_actual, pnl_dollar, pnl_pct'
        )
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('rule_results')
        .select(
          'id, setup_evaluation_id, rule_code, rule_name, passed, actual_value_text, actual_value_numeric, notes'
        )
        .order('created_at', { ascending: false })
        .limit(30),
    ])

    if (marketError) console.error('Market load error:', marketError)
    if (watchlistError) console.error('Watchlist load error:', watchlistError)
    if (tradePlanError) console.error('Trade plan load error:', tradePlanError)
    if (tradeError) console.error('Trade load error:', tradeError)
    if (ruleAuditError) console.error('Rule audit load error:', ruleAuditError)

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
    setRuleAuditRows(ruleAuditData ?? [])
  }

  useEffect(() => {
    const load = async () => {
      await loadDashboardData()
      setLoading(false)
    }

    void load()
  }, [])

  const metrics = useMemo(() => {
    const openTrades = savedTrades.filter(
      (trade) => trade.status === 'open' || trade.status === 'partial'
    )
    const closedTrades = savedTrades.filter((trade) => trade.status === 'closed')
    const totalRealizedPnl = closedTrades.reduce(
      (sum, trade) => sum + (trade.pnl_dollar ?? 0),
      0
    )
    const parsedPortfolioValue = Number(portfolioValue) || 0

    const { openPositionValue, exposurePct } = calculateExposure(
      openTrades,
      parsedPortfolioValue
    )

    const marketMaxExposurePct = market?.max_long_exposure_pct ?? 0

    return {
      watchlistCount: watchlist.length,
      openTradesCount: openTrades.length,
      closedTradesCount: closedTrades.length,
      totalRealizedPnl: Number(totalRealizedPnl.toFixed(2)),
      portfolioValue: parsedPortfolioValue,
      openPositionValue: Number(openPositionValue.toFixed(2)),
      exposurePct,
      marketMaxExposurePct,
    }
  }, [watchlist, savedTrades, portfolioValue, market])

  const exposurePreview = useMemo(() => {
    const portfolioValueNumber = Number(portfolioValue) || 0
    const currentOpenPositionValue = metrics.openPositionValue
    const newTradePositionValue = plan?.final_position_value ?? 0
    const exposureLimitPct = Number(market?.max_long_exposure_pct ?? 0)

    const hasValidPlan =
      !!plan &&
      plan.approval_status === 'approved' &&
      plan.final_position_value > 0 &&
      plan.expected_rr > 0

    return {
      portfolioValueNumber,
      currentOpenPositionValue,
      newTradePositionValue,
      exposureLimitPct,
      hasValidPlan,
    }
  }, [portfolioValue, metrics.openPositionValue, market, plan])

  const tradeMessageClass =
    tradeCreationMessage?.type === 'error'
      ? 'mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800'
      : tradeCreationMessage?.type === 'success'
        ? 'mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800'
        : 'mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700'

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

    const evaluationId = savedEvaluation?.id ?? null

    if (evaluationId) {
      const ruleRows = [
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'MARKET_PHASE',
          rule_name: 'Market Phase',
          passed: evaluation.market_phase_pass,
          actual_value_text: market.market_phase,
          actual_value_numeric: null,
          notes: 'Current market must allow new long entries',
        },
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'TREND_TEMPLATE',
          rule_name: 'Trend Template',
          passed: evaluation.trend_template_pass,
          actual_value_text: stock.trend_template_pass === true ? 'true' : 'false',
          actual_value_numeric: null,
          notes: 'Stock must satisfy trend template gate',
        },
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'LIQUIDITY',
          rule_name: 'Liquidity',
          passed: evaluation.liquidity_pass,
          actual_value_text: evaluation.liquidity_pass ? 'pass' : 'fail',
          actual_value_numeric: null,
          notes: 'Liquidity gate for trade execution quality',
        },
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'BASE_PATTERN',
          rule_name: 'Base Pattern',
          passed: evaluation.base_pattern_valid,
          actual_value_text: evaluation.base_pattern_valid ? 'valid' : 'invalid',
          actual_value_numeric: null,
          notes: 'Pattern structure must be valid',
        },
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'VOLUME_PATTERN',
          rule_name: 'Volume Pattern',
          passed: evaluation.volume_pattern_valid,
          actual_value_text: stock.volume_dry_up_pass === true ? 'true' : 'false',
          actual_value_numeric: null,
          notes: 'Dry-up / constructive volume behavior required',
        },
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'RS_CONFIRMATION',
          rule_name: 'RS Confirmation',
          passed: evaluation.rs_line_confirmed,
          actual_value_text: evaluation.rs_line_confirmed ? 'pass' : 'fail',
          actual_value_numeric: null,
          notes: 'Relative strength should confirm leadership',
        },
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'ENTRY_NEAR_PIVOT',
          rule_name: 'Entry Near Pivot',
          passed: evaluation.entry_near_pivot_pass,
          actual_value_text: evaluation.entry_near_pivot_pass ? 'pass' : 'fail',
          actual_value_numeric: null,
          notes: 'Entry should be near intended pivot / entry zone',
        },
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'BREAKOUT_VOLUME',
          rule_name: 'Breakout Volume',
          passed: evaluation.volume_breakout_pass,
          actual_value_text: evaluation.volume_breakout_pass ? 'pass' : 'fail',
          actual_value_numeric: null,
          notes: 'Breakout should have enough volume confirmation',
        },
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'FUNDAMENTAL',
          rule_name: 'Fundamental Quality',
          passed: evaluation.fundamental_pass,
          actual_value_text: evaluation.fundamental_pass ? 'pass' : 'fail',
          actual_value_numeric: null,
          notes: 'EPS growth, revenue growth, A/D rating, and industry rank must meet thresholds',
        },
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'SETUP_GRADE',
          rule_name: 'Setup Grade',
          passed: null,
          actual_value_text: evaluation.setup_grade,
          actual_value_numeric: null,
          notes: 'Quality grade influences aggressiveness and sizing',
        },
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'EARNINGS_RISK',
          rule_name: 'Earnings Risk',
          passed: !evaluation.earnings_risk_flag,
          actual_value_text: evaluation.earnings_risk_flag ? 'flagged' : 'clear',
          actual_value_numeric: null,
          notes: 'Earnings inside 2 weeks should reduce aggressiveness',
        },
        {
          setup_evaluation_id: evaluationId,
          rule_code: 'BINARY_EVENT_RISK',
          rule_name: 'Binary Event Risk',
          passed: !evaluation.binary_event_flag,
          actual_value_text: evaluation.binary_event_flag ? 'flagged' : 'clear',
          actual_value_numeric: null,
          notes: 'Binary event risk should reduce size or delay entry',
        },
      ]

      const { error: ruleInsertError } = await supabase
        .from('rule_results')
        .insert(ruleRows)

      if (ruleInsertError) {
        console.error(ruleInsertError)
        alert('Evaluation saved, but failed to save rule audit rows')
      }
    }

    setResult({
      id: evaluationId,
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
      setup_grade: evaluation.setup_grade,
      fundamental_pass: evaluation.fundamental_pass,
    })

    await loadDashboardData()
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

    if (!Number.isFinite(parsedExposure)) {
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
    target1Price: string
    target2Price: string
    trendTemplatePass: boolean
    volumeDryUpPass: boolean
    rsLineConfirmed: boolean
    basePatternValid: boolean
    entryNearPivot: boolean
    volumeBreakoutConfirmed: boolean
    liquidityPass: boolean
    epsGrowth: string
    epsAccelerating: boolean
    revenueGrowth: string
    accDistRating: string
    industryRank: string
  }) => {
    if (!payload.ticker.trim()) {
      alert('Ticker is required')
      return
    }

    const insertPayload = {
      ticker: payload.ticker.trim().toUpperCase(),
      company_name: payload.companyName.trim() || null,
      setup_type: 'breakout',
      setup_grade: payload.setupGrade,
      rr_ratio: payload.rrRatio ? Number(payload.rrRatio) : null,
      entry_zone_low: payload.entryZoneLow ? Number(payload.entryZoneLow) : null,
      entry_zone_high: payload.entryZoneHigh ? Number(payload.entryZoneHigh) : null,
      stop_price: payload.stopPrice ? Number(payload.stopPrice) : null,
      target_1_price: payload.target1Price ? Number(payload.target1Price) : null,
      target_2_price: payload.target2Price ? Number(payload.target2Price) : null,
      trend_template_pass: payload.trendTemplatePass,
      volume_dry_up_pass: payload.volumeDryUpPass,
      rs_line_confirmed: payload.rsLineConfirmed,
      base_pattern_valid: payload.basePatternValid,
      entry_near_pivot: payload.entryNearPivot,
      volume_breakout_confirmed: payload.volumeBreakoutConfirmed,
      liquidity_pass: payload.liquidityPass,
      eps_growth_pct: payload.epsGrowth ? Number(payload.epsGrowth) : null,
      eps_accelerating: payload.epsAccelerating,
      revenue_growth_pct: payload.revenueGrowth ? Number(payload.revenueGrowth) : null,
      acc_dist_rating: payload.accDistRating ?? null,
      industry_group_rank: payload.industryRank ? Number(payload.industryRank) : null,
      status: 'watchlist',
      action_status: 'watchlist',
    }

    const { data: insertedRow, error } = await supabase
      .from('watchlist')
      .insert(insertPayload)
      .select(
        'id, ticker, company_name, setup_grade, trend_template_pass, volume_dry_up_pass, rr_ratio, earnings_within_2_weeks, binary_event_risk, pivot_price, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price, rs_line_confirmed, base_pattern_valid, entry_near_pivot, volume_breakout_confirmed, liquidity_pass, eps_growth_pct, eps_accelerating, revenue_growth_pct, acc_dist_rating, industry_group_rank'
      )
      .single()

    if (error) {
      console.error(error)
      alert('Failed to add watchlist stock')
      return
    }

    setWatchlist((prev) => [insertedRow, ...prev])
    setStock(insertedRow)
    setResult(null)
    setPlan(null)
    setLatestTradePlanId(null)
    setTradeCreationMessage(null)
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
    setTradeCreationMessage(null)

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
      setTradeCreationMessage({
        type: 'error',
        text: 'Generate a trade plan first before creating a trade.',
      })
      return
    }

    if (plan.approval_status !== 'approved') {
      setTradeCreationMessage({
        type: 'error',
        text: `Trade blocked: ${plan.blocked_reason ?? 'trade plan is not approved.'}`,
      })
      return
    }

    if (!plan.expected_rr || plan.expected_rr <= 0) {
      setTradeCreationMessage({
        type: 'error',
        text: 'Trade blocked: invalid trade plan (R/R calculation error).',
      })
      return
    }

    if (!plan.final_shares || plan.final_shares <= 0) {
      setTradeCreationMessage({
        type: 'error',
        text: 'Trade blocked: invalid share sizing.',
      })
      return
    }

    if (!plan.entry_price || !plan.stop_price) {
      setTradeCreationMessage({
        type: 'error',
        text: 'Trade blocked: missing entry or stop.',
      })
      return
    }

    if (plan.entry_price <= plan.stop_price) {
      setTradeCreationMessage({
        type: 'error',
        text: 'Trade blocked: invalid stop placement.',
      })
      return
    }

    const portfolioValueNumber = Number(portfolioValue)
    const newTradePositionValue = Number(plan.final_position_value)
    const exposureLimitPct = Number(market?.max_long_exposure_pct ?? 0)

    if (!Number.isFinite(portfolioValueNumber) || portfolioValueNumber <= 0) {
      setTradeCreationMessage({
        type: 'error',
        text: 'Trade blocked: invalid portfolio value.',
      })
      return
    }

    if (!Number.isFinite(exposureLimitPct) || exposureLimitPct < 0) {
      setTradeCreationMessage({
        type: 'error',
        text: 'Trade blocked: invalid market exposure limit.',
      })
      return
    }

    const { data: currentOpenTrades, error: exposureLoadError } = await supabase
      .from('trades')
      .select('entry_price_actual, shares_entered, status')
      .in('status', ['open', 'partial'])

    if (exposureLoadError) {
      console.error(exposureLoadError)
      setTradeCreationMessage({
        type: 'error',
        text: 'Could not verify current portfolio exposure.',
      })
      return
    }

    const {
      openPositionValue: currentOpenPositionValue,
      exposurePct: currentExposurePct,
    } = calculateExposure(currentOpenTrades ?? [], portfolioValueNumber)

    const postTradeExposurePct =
      portfolioValueNumber > 0
        ? Number(
            (
              ((currentOpenPositionValue + newTradePositionValue) /
                portfolioValueNumber) *
              100
            ).toFixed(2)
          )
        : 0

    if (postTradeExposurePct > exposureLimitPct) {
      setTradeCreationMessage({
        type: 'error',
        text: `Trade blocked: exposure limit exceeded. Current exposure: ${currentExposurePct}%. Exposure after trade: ${postTradeExposurePct}%. Limit: ${exposureLimitPct}%.`,
      })
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
      setTradeCreationMessage({
        type: 'error',
        text: 'Failed to create trade.',
      })
      return
    }

    await supabase
      .from('trade_plans')
      .update({ approval_status: 'executed' })
      .eq('id', latestTradePlanId)

    await loadDashboardData()

    setTradeCreationMessage({
      type: 'success',
      text: `Trade created successfully. Current exposure: ${currentExposurePct}%. Exposure after trade: ${postTradeExposurePct}%. Limit: ${exposureLimitPct}%.`,
    })

    setPlan(null)
    setLatestTradePlanId(null)
  }

  const handleCloseTrade = async (tradeId: string, exitPrice: string) => {
    const parsedExitPrice = Number(exitPrice)

    if (!parsedExitPrice || parsedExitPrice <= 0) {
      alert('Enter a valid exit price')
      return
    }

    const trade = savedTrades.find((row) => row.id === tradeId)

    if (!trade || !trade.entry_price_actual || !trade.shares_entered) {
      alert('Trade data is incomplete')
      return
    }

    let pnlDollar = 0
    if (trade.side === 'long') {
      pnlDollar = (parsedExitPrice - trade.entry_price_actual) * trade.shares_entered
    } else {
      pnlDollar = (trade.entry_price_actual - parsedExitPrice) * trade.shares_entered
    }

    const pnlPct =
      ((parsedExitPrice - trade.entry_price_actual) / trade.entry_price_actual) * 100

    const { error } = await supabase
      .from('trades')
      .update({
        status: 'closed',
        exit_date: new Date().toISOString().slice(0, 10),
        exit_price_actual: parsedExitPrice,
        shares_exited: trade.shares_entered,
        pnl_dollar: Number(pnlDollar.toFixed(2)),
        pnl_pct: Number(pnlPct.toFixed(2)),
      })
      .eq('id', tradeId)

    if (error) {
      console.error(error)
      alert('Failed to close trade')
      return
    }

    await loadDashboardData()
    alert('Trade closed successfully')
  }

  const handleUpdateStop = async (tradeId: string, newStopPrice: string) => {
    const parsedStop = Number(newStopPrice)

    if (!parsedStop || parsedStop <= 0) {
      alert('Enter a valid stop price')
      return
    }

    const { error } = await supabase
      .from('trades')
      .update({
        stop_price_current: parsedStop,
      })
      .eq('id', tradeId)

    if (error) {
      console.error(error)
      alert('Failed to update stop')
      return
    }

    await loadDashboardData()
    alert('Stop updated successfully')
  }

  const handlePartialExit = async (
    tradeId: string,
    exitPrice: string,
    exitShares: string
  ) => {
    const parsedExitPrice = Number(exitPrice)
    const parsedExitShares = Number(exitShares)

    if (!parsedExitPrice || parsedExitPrice <= 0) {
      alert('Enter a valid exit price')
      return
    }

    if (!parsedExitShares || parsedExitShares <= 0) {
      alert('Enter valid exit shares')
      return
    }

    if (!Number.isInteger(parsedExitShares)) {
      alert('Exit shares must be a whole number')
      return
    }

    const trade = savedTrades.find((row) => row.id === tradeId)

    if (!trade || !trade.entry_price_actual || !trade.shares_entered) {
      alert('Trade data is incomplete')
      return
    }

    if (parsedExitShares > trade.shares_entered) {
      alert('Exit shares cannot exceed current shares')
      return
    }

    let partialPnlDollar = 0
    if (trade.side === 'long') {
      partialPnlDollar =
        (parsedExitPrice - trade.entry_price_actual) * parsedExitShares
    } else {
      partialPnlDollar =
        (trade.entry_price_actual - parsedExitPrice) * parsedExitShares
    }

    const remainingShares = trade.shares_entered - parsedExitShares
    const newStatus = remainingShares > 0 ? 'partial' : 'closed'
    const finalPnlDollar =
      (trade.pnl_dollar ?? 0) + Number(partialPnlDollar.toFixed(2))
    const finalPnlPct =
      ((parsedExitPrice - trade.entry_price_actual) / trade.entry_price_actual) *
      100

    const updatePayload: {
      status: string
      shares_entered: number
      pnl_dollar: number
      pnl_pct: number
      exit_date?: string
      exit_price_actual?: number
      shares_exited?: number
    } = {
      status: newStatus,
      shares_entered: remainingShares,
      pnl_dollar: Number(finalPnlDollar.toFixed(2)),
      pnl_pct: Number(finalPnlPct.toFixed(2)),
    }

    if (remainingShares === 0) {
      updatePayload.exit_date = new Date().toISOString().slice(0, 10)
      updatePayload.exit_price_actual = parsedExitPrice
      updatePayload.shares_exited = parsedExitShares
    }

    const { error } = await supabase
      .from('trades')
      .update(updatePayload)
      .eq('id', tradeId)

    if (error) {
      console.error(error)
      alert('Failed to process partial exit')
      return
    }

    await loadDashboardData()
    alert('Partial exit processed successfully')
  }

  if (loading) {
    return <main className="p-10">Loading...</main>
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <section className="mx-auto max-w-6xl">
        <AppHeader
          title="Setup Evaluator"
          subtitle="Market-first rule engine, trade planning, execution, and exposure control."
        />

        <DashboardMetrics
          watchlistCount={metrics.watchlistCount}
          openTradesCount={metrics.openTradesCount}
          closedTradesCount={metrics.closedTradesCount}
          totalRealizedPnl={metrics.totalRealizedPnl}
        />

        <PortfolioHeatCard
          portfolioValue={metrics.portfolioValue}
          openPositionValue={metrics.openPositionValue}
          exposurePct={metrics.exposurePct}
          marketMaxExposurePct={metrics.marketMaxExposurePct}
        />

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
            setTradeCreationMessage(null)
          }}
          onUpdate={async (rowId, payload) => {
            const { data: updatedRow, error } = await supabase
              .from('watchlist')
              .update({
                company_name: payload.companyName.trim() || null,
                setup_grade: payload.setupGrade,
                rr_ratio: payload.rrRatio ? Number(payload.rrRatio) : null,
                entry_zone_low: payload.entryZoneLow ? Number(payload.entryZoneLow) : null,
                entry_zone_high: payload.entryZoneHigh ? Number(payload.entryZoneHigh) : null,
                stop_price: payload.stopPrice ? Number(payload.stopPrice) : null,
                target_1_price: payload.target1Price ? Number(payload.target1Price) : null,
                target_2_price: payload.target2Price ? Number(payload.target2Price) : null,
              })
              .eq('id', rowId)
              .select(
                'id, ticker, company_name, setup_grade, trend_template_pass, volume_dry_up_pass, rr_ratio, earnings_within_2_weeks, binary_event_risk, pivot_price, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price, rs_line_confirmed, base_pattern_valid, entry_near_pivot, volume_breakout_confirmed, liquidity_pass, eps_growth_pct, eps_accelerating, revenue_growth_pct, acc_dist_rating, industry_group_rank'
              )
              .single()

            if (error) {
              console.error(error)
              alert('Failed to update watchlist row')
              return
            }

            setWatchlist((prev) =>
              prev.map((row) => (row.id === rowId ? updatedRow : row))
            )

            if (stock?.id === rowId) {
              setStock(updatedRow)
              setResult(null)
              setPlan(null)
              setLatestTradePlanId(null)
              setTradeCreationMessage(null)
            }
          }}
          onDelete={async (rowId, ticker) => {
            const { error } = await supabase
              .from('watchlist')
              .delete()
              .eq('id', rowId)

            if (error) {
              console.error(error)
              alert(`Failed to delete watchlist row for ${ticker}`)
              return
            }

            setWatchlist((prev) => prev.filter((row) => row.id !== rowId))

            if (stock?.id === rowId) {
              setStock(null)
              setResult(null)
              setPlan(null)
              setLatestTradePlanId(null)
              setTradeCreationMessage(null)
            }
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

        <ExposurePreviewPanel
          portfolioValue={exposurePreview.portfolioValueNumber}
          currentOpenPositionValue={exposurePreview.currentOpenPositionValue}
          newTradePositionValue={exposurePreview.newTradePositionValue}
          exposureLimitPct={exposurePreview.exposureLimitPct}
          hasValidPlan={exposurePreview.hasValidPlan}
        />

        {tradeCreationMessage ? (
          <div className={tradeMessageClass}>
            {tradeCreationMessage.text}
          </div>
        ) : null}

        <EvaluationPanel result={result} />
        <TradePlanPanel plan={plan} />
        <SavedTradePlansTable savedPlans={savedPlans} />
        <TradeManagementTable
          savedTrades={savedTrades}
          onCloseTrade={handleCloseTrade}
        />
        <StopUpdateTable
          savedTrades={savedTrades}
          onUpdateStop={handleUpdateStop}
        />
        <PartialExitTable
          savedTrades={savedTrades}
          onPartialExit={handlePartialExit}
        />
        <RuleAuditTable rows={ruleAuditRows} />
      </section>
    </main>
  )
}
