import { useState, type Dispatch, type SetStateAction } from 'react'
import { evaluateSetup } from '@/lib/evaluateSetup'
import { generateTradePlan } from '@/lib/generateTradePlan'
import { calculateExposure } from '@/lib/calculateExposure'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type {
  MarketSnapshot,
  WatchlistRow,
  EvalResult,
  TradePlanResult,
  SavedTradePlan,
  SavedTrade,
  TradeCreationMessage,
} from '@/types/dashboard'

type UseTradeActionsParams = {
  supabase: ReturnType<typeof createSupabaseBrowserClient>
  market: MarketSnapshot | null
  stock: WatchlistRow | null
  setStock: (stock: WatchlistRow | null) => void
  watchlist: WatchlistRow[]
  setWatchlist: Dispatch<SetStateAction<WatchlistRow[]>>
  portfolioValue: string
  setSavedPlans: Dispatch<SetStateAction<SavedTradePlan[]>>
  savedTrades: SavedTrade[]
  loadDashboardData: () => Promise<void>
}

export function useTradeActions(params: UseTradeActionsParams) {
  const [result, setResult] = useState<EvalResult | null>(null)
  const [plan, setPlan] = useState<TradePlanResult | null>(null)
  const [latestTradePlanId, setLatestTradePlanId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tradeCreationMessage, setTradeCreationMessage] =
    useState<TradeCreationMessage | null>(null)

  const runEvaluation = async () => {
    if (!params.market || !params.stock) return

    const {
      data: { user },
    } = await params.supabase.auth.getUser()

    if (!user) return

    setSaving(true)

    const evaluation = evaluateSetup(params.market, params.stock)

    const { data: savedEvaluation, error } = await params.supabase
      .from('setup_evaluations')
      .insert({
        user_id: user.id,
        watchlist_id: params.stock.id,
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
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'MARKET_PHASE',
          rule_name: 'Market Phase',
          passed: evaluation.market_phase_pass,
          actual_value_text: params.market.market_phase,
          actual_value_numeric: null,
          notes: 'Current market must allow new long entries',
        },
        {
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'TREND_TEMPLATE',
          rule_name: 'Trend Template',
          passed: evaluation.trend_template_pass,
          actual_value_text:
            params.stock.trend_template_pass === true ? 'true' : 'false',
          actual_value_numeric: null,
          notes: 'Stock must satisfy trend template gate',
        },
        {
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'LIQUIDITY',
          rule_name: 'Liquidity',
          passed: evaluation.liquidity_pass,
          actual_value_text: evaluation.liquidity_pass ? 'pass' : 'fail',
          actual_value_numeric: null,
          notes: 'Liquidity gate for trade execution quality',
        },
        {
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'BASE_PATTERN',
          rule_name: 'Base Pattern',
          passed: evaluation.base_pattern_valid,
          actual_value_text: evaluation.base_pattern_valid ? 'valid' : 'invalid',
          actual_value_numeric: null,
          notes: 'Pattern structure must be valid',
        },
        {
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'VOLUME_PATTERN',
          rule_name: 'Volume Pattern',
          passed: evaluation.volume_pattern_valid,
          actual_value_text:
            params.stock.volume_dry_up_pass === true ? 'true' : 'false',
          actual_value_numeric: null,
          notes: 'Dry-up / constructive volume behavior required',
        },
        {
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'RS_CONFIRMATION',
          rule_name: 'RS Confirmation',
          passed: evaluation.rs_line_confirmed,
          actual_value_text: evaluation.rs_line_confirmed ? 'pass' : 'fail',
          actual_value_numeric: null,
          notes: 'Relative strength should confirm leadership',
        },
        {
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'ENTRY_NEAR_PIVOT',
          rule_name: 'Entry Near Pivot',
          passed: evaluation.entry_near_pivot_pass,
          actual_value_text: evaluation.entry_near_pivot_pass ? 'pass' : 'fail',
          actual_value_numeric: null,
          notes: 'Entry should be near intended pivot / entry zone',
        },
        {
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'BREAKOUT_VOLUME',
          rule_name: 'Breakout Volume',
          passed: evaluation.volume_breakout_pass,
          actual_value_text: evaluation.volume_breakout_pass ? 'pass' : 'fail',
          actual_value_numeric: null,
          notes: 'Breakout should have enough volume confirmation',
        },
        {
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'FUNDAMENTAL',
          rule_name: 'Fundamental Quality',
          passed: evaluation.fundamental_pass,
          actual_value_text: evaluation.fundamental_pass ? 'pass' : 'fail',
          actual_value_numeric: null,
          notes: 'EPS growth, revenue growth, A/D rating, and industry rank must meet thresholds',
        },
        {
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'SETUP_GRADE',
          rule_name: 'Setup Grade',
          passed: null,
          actual_value_text: evaluation.setup_grade,
          actual_value_numeric: null,
          notes: 'Quality grade influences aggressiveness and sizing',
        },
        {
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'EARNINGS_RISK',
          rule_name: 'Earnings Risk',
          passed: !evaluation.earnings_risk_flag,
          actual_value_text: evaluation.earnings_risk_flag ? 'flagged' : 'clear',
          actual_value_numeric: null,
          notes: 'Earnings inside 2 weeks should reduce aggressiveness',
        },
        {
          user_id: user.id,
          setup_evaluation_id: evaluationId,
          rule_code: 'BINARY_EVENT_RISK',
          rule_name: 'Binary Event Risk',
          passed: !evaluation.binary_event_flag,
          actual_value_text: evaluation.binary_event_flag ? 'flagged' : 'clear',
          actual_value_numeric: null,
          notes: 'Binary event risk should reduce size or delay entry',
        },
      ]

      const { error: ruleInsertError } = await params.supabase
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

    await params.loadDashboardData()
    setSaving(false)
  }

  const handleSaveMarketSnapshot = async (payload: {
    snapshotDate: string
    marketPhase: string
    maxLongExposurePct: string
  }) => {
    const parsedExposure = Number(payload.maxLongExposurePct)

    const {
      data: { user },
    } = await params.supabase.auth.getUser()

    if (!user) return

    if (!payload.snapshotDate) {
      alert('Snapshot date is required')
      return
    }

    if (!Number.isFinite(parsedExposure)) {
      alert('Enter a valid max long exposure')
      return
    }

    const { error } = await params.supabase.from('market_snapshots').upsert(
      {
        user_id: user.id,
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

    await params.loadDashboardData()
    alert('Market snapshot saved')
  }

  const handleAddWatchlistStock = async (payload: {
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
  }) => {
    if (!payload.ticker.trim()) {
      alert('Ticker is required')
      return
    }
    const {
      data: { user },
    } = await params.supabase.auth.getUser()

    if (!user) return

    const insertPayload = {
      user_id: user.id,
      ticker: payload.ticker.trim().toUpperCase(),
      company_name: payload.companyName.trim() || null,
      setup_type: 'breakout',
      setup_grade: payload.setupGrade,
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
      earnings_within_2_weeks: payload.earningsWithin2Weeks,
      binary_event_risk: payload.binaryEventRisk,
      eps_growth_pct: payload.epsGrowth ? Number(payload.epsGrowth) : null,
      eps_accelerating: payload.epsAccelerating,
      revenue_growth_pct: payload.revenueGrowth ? Number(payload.revenueGrowth) : null,
      acc_dist_rating: payload.accDistRating ?? null,
      industry_group_rank: payload.industryRank ? Number(payload.industryRank) : null,
      status: 'watchlist',
      action_status: 'watchlist',
    }

    const { data: insertedRow, error } = await params.supabase
      .from('watchlist')
      .insert(insertPayload)
      .select(
        'id, ticker, company_name, setup_grade, trend_template_pass, volume_dry_up_pass, earnings_within_2_weeks, binary_event_risk, pivot_price, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price, rs_line_confirmed, base_pattern_valid, entry_near_pivot, volume_breakout_confirmed, liquidity_pass, eps_growth_pct, eps_accelerating, revenue_growth_pct, acc_dist_rating, industry_group_rank'
      )
      .single()

    if (error) {
      console.error(error)
      alert('Failed to add watchlist stock')
      return
    }

    params.setWatchlist((prev) => [insertedRow, ...prev])
    params.setStock(insertedRow)
    setResult(null)
    setPlan(null)
    setLatestTradePlanId(null)
    setTradeCreationMessage(null)
  }

  const handleGenerateTradePlan = async () => {
    if (!params.market || !params.stock) return
    const {
      data: { user },
    } = await params.supabase.auth.getUser()

    if (!user) return

    if (!result) {
      alert('Evaluate the setup before generating a trade plan')
      return
    }

    if (result.verdict === 'fail') {
      alert('This setup failed evaluation and cannot generate a trade plan')
      return
    }

    const parsedPortfolioValue = Number(params.portfolioValue)

    if (!parsedPortfolioValue || parsedPortfolioValue <= 0) {
      alert('Enter a valid portfolio value')
      return
    }

    const tradePlan = generateTradePlan(
      params.market,
      params.stock,
      parsedPortfolioValue
    )

    const { data: savedTradePlan, error } = await params.supabase
      .from('trade_plans')
      .insert({
        user_id: user.id,
        watchlist_id: params.stock.id,
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

    const { data: refreshedPlans } = await params.supabase
      .from('trade_plans')
      .select(
        'id, plan_date, side, entry_price, stop_price, final_shares, final_position_value, expected_rr, approval_status, blocked_reason'
      )
      .order('created_at', { ascending: false })
      .limit(10)

    params.setSavedPlans(refreshedPlans ?? [])
  }

  const handleCreateTrade = async () => {
    if (!params.stock || !plan || !latestTradePlanId) {
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
    const {
      data: { user },
    } = await params.supabase.auth.getUser()

    if (!user) return

    const portfolioValueNumber = Number(params.portfolioValue)
    const newTradePositionValue = Number(plan.final_position_value)
    const exposureLimitPct = Number(params.market?.max_long_exposure_pct ?? 0)

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

    const { data: currentOpenTrades, error: exposureLoadError } =
      await params.supabase
        .from('trades')
        .select('entry_price_actual, shares_entered, shares_exited, status')
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

    const { error } = await params.supabase.from('trades').insert({
      user_id: user.id,
      trade_plan_id: latestTradePlanId,
      ticker: params.stock.ticker,
      side: 'long',
      status: 'open',
      entry_date: new Date().toISOString().slice(0, 10),
      entry_price_actual: plan.entry_price,
      shares_entered: plan.final_shares,
      shares_exited: 0,
      stop_price_initial: plan.stop_price,
      stop_price_current: plan.stop_price,
      target_1_price: params.stock.target_1_price,
      target_2_price: params.stock.target_2_price,
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

    await params.supabase
      .from('trade_plans')
      .update({ approval_status: 'executed' })
      .eq('id', latestTradePlanId)

    await params.loadDashboardData()

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

    const trade = params.savedTrades.find((row) => row.id === tradeId)

    if (!trade || !trade.entry_price_actual || !trade.shares_entered) {
      alert('Trade data is incomplete')
      return
    }

    const alreadyExited = trade.shares_exited ?? 0
    const remainingShares = trade.shares_entered - alreadyExited

    if (remainingShares <= 0) {
      alert('No open shares remain on this trade')
      return
    }

    let closePnlDollar = 0
    if (trade.side === 'long') {
      closePnlDollar =
        (parsedExitPrice - trade.entry_price_actual) * remainingShares
    } else {
      closePnlDollar =
        (trade.entry_price_actual - parsedExitPrice) * remainingShares
    }

    const finalPnlDollar = (trade.pnl_dollar ?? 0) + Number(closePnlDollar.toFixed(2))
    const originalCostBasis = trade.entry_price_actual * trade.shares_entered
    const pnlPct =
      originalCostBasis > 0 ? (finalPnlDollar / originalCostBasis) * 100 : 0

    const { error } = await params.supabase
      .from('trades')
      .update({
        status: 'closed',
        exit_date: new Date().toISOString().slice(0, 10),
        exit_price_actual: parsedExitPrice,
        shares_exited: trade.shares_entered,
        pnl_dollar: Number(finalPnlDollar.toFixed(2)),
        pnl_pct: Number(pnlPct.toFixed(2)),
      })
      .eq('id', tradeId)

    if (error) {
      console.error(error)
      alert('Failed to close trade')
      return
    }

    await params.loadDashboardData()
    alert('Trade closed successfully')
  }

  const handleUpdateStop = async (tradeId: string, newStopPrice: string) => {
    const parsedStop = Number(newStopPrice)

    if (!parsedStop || parsedStop <= 0) {
      alert('Enter a valid stop price')
      return
    }

    const { error } = await params.supabase
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

    await params.loadDashboardData()
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

    const trade = params.savedTrades.find((row) => row.id === tradeId)

    if (!trade || !trade.entry_price_actual || !trade.shares_entered) {
      alert('Trade data is incomplete')
      return
    }

    const currentOpenShares =
      trade.shares_entered - (trade.shares_exited ?? 0)

    if (parsedExitShares > currentOpenShares) {
      alert('Exit shares cannot exceed current open shares')
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

    const alreadyExited = trade.shares_exited ?? 0
    const newSharesExited = alreadyExited + parsedExitShares
    const remainingShares = currentOpenShares - parsedExitShares
    const newStatus = remainingShares > 0 ? 'partial' : 'closed'
    const finalPnlDollar =
      (trade.pnl_dollar ?? 0) + Number(partialPnlDollar.toFixed(2))
    const originalCostBasis = trade.entry_price_actual * trade.shares_entered
    const finalPnlPct =
      originalCostBasis > 0 ? (finalPnlDollar / originalCostBasis) * 100 : 0

    const updatePayload: {
      status: string
      shares_exited: number
      pnl_dollar: number
      pnl_pct: number
      exit_date?: string
      exit_price_actual?: number
    } = {
      status: newStatus,
      shares_exited: newSharesExited,
      pnl_dollar: Number(finalPnlDollar.toFixed(2)),
      pnl_pct: Number(finalPnlPct.toFixed(2)),
    }

    if (remainingShares === 0) {
      updatePayload.exit_date = new Date().toISOString().slice(0, 10)
      updatePayload.exit_price_actual = parsedExitPrice
      updatePayload.shares_exited = newSharesExited
    }

    const { error } = await params.supabase
      .from('trades')
      .update(updatePayload)
      .eq('id', tradeId)

    if (error) {
      console.error(error)
      alert('Failed to process partial exit')
      return
    }

    await params.loadDashboardData()
    alert('Partial exit processed successfully')
  }

  return {
    result,
    setResult,
    plan,
    setPlan,
    latestTradePlanId,
    setLatestTradePlanId,
    saving,
    tradeCreationMessage,
    setTradeCreationMessage,
    runEvaluation,
    handleSaveMarketSnapshot,
    handleAddWatchlistStock,
    handleGenerateTradePlan,
    handleCreateTrade,
    handleCloseTrade,
    handleUpdateStop,
    handlePartialExit,
  }
}