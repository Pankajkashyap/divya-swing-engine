'use client'

import { useMemo, useState } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { usePortfolioValue } from '@/hooks/usePortfolioValue'
import { useTradeActions } from '@/hooks/useTradeActions'
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
import { MarketSnapshotChatGPTWorkflow } from '@/components/MarketSnapshotChatGPTWorkflow'
import { calculateExposure } from '@/lib/calculateExposure'

export type {
  MarketSnapshot,
  WatchlistRow,
  EvalResult,
  TradePlanResult,
  SavedTradePlan,
  SavedTrade,
} from '@/types/dashboard'

export default function HomePage() {
  const {
    supabase,
    market,
    stock,
    setStock,
    watchlist,
    setWatchlist,
    savedPlans,
    setSavedPlans,
    savedTrades,
    ruleAuditRows,
    loading,
    loadDashboardData,
  } = useDashboardData()

  const { portfolioValue, setPortfolioValue } = usePortfolioValue()

  const {
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
  } = useTradeActions({
    supabase,
    market,
    stock,
    setStock,
    watchlist,
    setWatchlist,
    portfolioValue,
    setSavedPlans,
    savedTrades,
    loadDashboardData,
  })

  const [activeTab, setActiveTab] = useState<
    'overview' | 'watchlist' | 'trades' | 'review'
  >('overview')

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
    const { openPositionValue, exposurePct } = calculateExposure(openTrades, parsedPortfolioValue)
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
      ? 'mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
      : tradeCreationMessage?.type === 'success'
        ? 'mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300'
        : 'mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'

  const evaluateSetupBlockReason = !market
    ? 'Save a market snapshot to enable setup evaluation.'
    : !stock
      ? 'Select a valid watchlist stock to enable setup evaluation.'
      : saving
        ? 'Evaluation in progress...'
        : null

  const generateTradePlanBlockReason = !market
    ? 'Save a market snapshot before generating a trade plan.'
    : !stock
      ? 'Select a valid watchlist stock before generating a trade plan.'
      : !result
        ? 'Evaluate the selected setup before generating a trade plan.'
        : result.verdict === 'fail'
          ? 'This setup failed evaluation, so a trade plan cannot be generated.'
          : null

  const createTradeBlockReason = !stock
    ? 'Select a valid watchlist stock before creating a trade.'
    : !plan || !latestTradePlanId
      ? 'Generate an approved trade plan before creating a trade.'
      : plan.approval_status !== 'approved'
        ? `Trade blocked: ${plan.blocked_reason ?? 'trade plan is not approved.'}`
        : null

  if (loading) {
    return (
      <main className="ui-page">
        Loading...
      </main>
    )
  }

  return (
    <main className="ui-page">
      <section className="mx-auto max-w-7xl">
<AppHeader title="Setup Evaluator" />
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {(['overview', 'watchlist', 'trades', 'review'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 capitalize ${activeTab === tab ? 'ui-link-pill-active' : 'ui-link-pill-idle'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <DashboardMetrics watchlistCount={metrics.watchlistCount} openTradesCount={metrics.openTradesCount} closedTradesCount={metrics.closedTradesCount} totalRealizedPnl={metrics.totalRealizedPnl} />
            <PortfolioHeatCard portfolioValue={metrics.portfolioValue} openPositionValue={metrics.openPositionValue} exposurePct={metrics.exposurePct} marketMaxExposurePct={metrics.marketMaxExposurePct} />
            <MarketSummaryCards market={market} stock={stock} portfolioValue={portfolioValue} setPortfolioValue={setPortfolioValue} />
            <MarketSnapshotForm
              onSave={handleSaveMarketSnapshot}
              initialDate={market?.snapshot_date ?? null}
              initialPhase={market?.market_phase ?? null}
              initialExposure={market?.max_long_exposure_pct ?? null}
            />
            <MarketSnapshotChatGPTWorkflow />
          </>
        )}

        {activeTab === 'watchlist' && (
          <>
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
                    entry_zone_low: payload.entryZoneLow ? Number(payload.entryZoneLow) : null,
                    entry_zone_high: payload.entryZoneHigh ? Number(payload.entryZoneHigh) : null,
                    stop_price: payload.stopPrice ? Number(payload.stopPrice) : null,
                    target_1_price: payload.target1Price ? Number(payload.target1Price) : null,
                    target_2_price: payload.target2Price ? Number(payload.target2Price) : null,
                    earnings_within_2_weeks: payload.earningsWithin2Weeks,
                    binary_event_risk: payload.binaryEventRisk,
                    eps_growth_pct: payload.epsGrowth ? Number(payload.epsGrowth) : null,
                    eps_accelerating: payload.epsAccelerating,
                    revenue_growth_pct: payload.revenueGrowth ? Number(payload.revenueGrowth) : null,
                    acc_dist_rating: payload.accDistRating ?? null,
                    industry_group_rank: payload.industryRank ? Number(payload.industryRank) : null,
                  })
                  .eq('id', rowId)
                  .select(
                    'id, ticker, company_name, setup_grade, trend_template_pass, volume_dry_up_pass, earnings_within_2_weeks, binary_event_risk, pivot_price, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price, rs_line_confirmed, base_pattern_valid, entry_near_pivot, volume_breakout_confirmed, liquidity_pass, eps_growth_pct, eps_accelerating, revenue_growth_pct, acc_dist_rating, industry_group_rank'
                  )
                  .single()

                if (error) {
                  console.error(error)
                  alert('Failed to update watchlist row')
                  return
                }

                setWatchlist((prev) => prev.map((row) => (row.id === rowId ? updatedRow : row)))

                if (stock?.id === rowId) {
                  setStock(updatedRow)
                  setResult(null)
                  setPlan(null)
                  setLatestTradePlanId(null)
                  setTradeCreationMessage(null)
                }
              }}
              onDelete={async (rowId, ticker) => {
                const rowToDelete = watchlist.find((r) => r.id === rowId)
                const isManual = rowToDelete?.source !== 'automation'

                if (isManual) {
                  const confirmed = window.confirm(
                    `Archive ${ticker} from your watchlist? This preserves your evaluation history.`
                  )
                  if (!confirmed) return

                  const { error } = await supabase
                    .from('watchlist')
                    .update({ signal_state: 'archived' })
                    .eq('id', rowId)

                  if (error) {
                    console.error(error)
                    alert(`Failed to archive ${ticker}`)
                    return
                  }
                } else {
                  const { error } = await supabase
                    .from('watchlist')
                    .delete()
                    .eq('id', rowId)

                  if (error) {
                    console.error(error)
                    alert(`Failed to delete watchlist row for ${ticker}`)
                    return
                  }
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
              canGenerate={!!market && !!stock && !!result && result.verdict !== 'fail'}
              canCreate={!!stock && !!plan && !!latestTradePlanId && plan.approval_status === 'approved'}
              saving={saving}
              evaluateBlockReason={evaluateSetupBlockReason}
              generateBlockReason={generateTradePlanBlockReason}
              createBlockReason={createTradeBlockReason}
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
              <div className={tradeMessageClass}>{tradeCreationMessage.text}</div>
            ) : null}
            <EvaluationPanel result={result} />
            <TradePlanPanel plan={plan} />
            <SavedTradePlansTable savedPlans={savedPlans} />
          </>
        )}

        {activeTab === 'trades' && (
          <>
            <TradeManagementTable savedTrades={savedTrades} onCloseTrade={handleCloseTrade} />
            <StopUpdateTable savedTrades={savedTrades} onUpdateStop={handleUpdateStop} />
            <PartialExitTable savedTrades={savedTrades} onPartialExit={handlePartialExit} />
          </>
        )}

        {activeTab === 'review' && <RuleAuditTable rows={ruleAuditRows} />}
      </section>
    </main>
  )
}