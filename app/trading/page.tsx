'use client'

import { useMemo, useState } from 'react'
import { useDashboardData } from '@/app/trading/hooks/useDashboardData'
import { usePortfolioValue } from '@/app/trading/hooks/usePortfolioValue'
import { useTradeActions } from '@/app/trading/hooks/useTradeActions'
import { calculateExposure } from '@/app/trading/lib/calculateExposure'
import { AppHeader } from '@/app/trading/components/AppHeader'
import { DashboardMetrics } from '@/app/trading/components/DashboardMetrics'
import { PortfolioHeatCard } from '@/app/trading/components/PortfolioHeatCard'
import { MarketSummaryCards } from '@/app/trading/components/MarketSummaryCards'
import { AddWatchlistStockForm } from '@/app/trading/components/AddWatchlistStockForm'
import { WatchlistSelectionTable } from '@/app/trading/components/WatchlistSelectionTable'
import { TradeActionButtons } from '@/app/trading/components/TradeActionButtons'
import { EvaluationPanel } from '@/app/trading/components/EvaluationPanel'
import { TradePlanPanel } from '@/app/trading/components/TradePlanPanel'
import { SavedTradePlansTable } from '@/app/trading/components/SavedTradePlansTable'
import { MarketSnapshotForm } from '@/app/trading/components/MarketSnapshotForm'
import { TradeManagementTable } from '@/app/trading/components/TradeManagementTable'
import { RuleAuditTable } from '@/app/trading/components/RuleAuditTable'
import { StopUpdateTable } from '@/app/trading/components/StopUpdateTable'
import { PartialExitTable } from '@/app/trading/components/PartialExitTable'
import { ExposurePreviewPanel } from '@/app/trading/components/ExposurePreviewPanel'
import { MarketSnapshotChatGPTWorkflow } from '@/app/trading/components/MarketSnapshotChatGPTWorkflow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { BottomSheet } from '@/components/ui/BottomSheet'

export type {
  MarketSnapshot,
  WatchlistRow,
  EvalResult,
  TradePlanResult,
  SavedTradePlan,
  SavedTrade,
} from '@/app/trading/types/dashboard'

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
  const [marketPhaseOverride, setMarketPhaseOverride] = useState<string | null>(null)
  const [marketExposureOverride, setMarketExposureOverride] = useState<number | null>(null)
  const [watchlistFormOpen, setWatchlistFormOpen] = useState(false)

  const marketPhaseState = marketPhaseOverride ?? market?.market_phase ?? null
  const marketExposureState = marketExposureOverride ?? market?.max_long_exposure_pct ?? null

  const metrics = useMemo(() => {
    const openTrades = savedTrades.filter(
      (trade) => trade.status === 'open' || trade.status === 'partial'
    )
    const closedTrades = savedTrades.filter((trade) => trade.status === 'closed')
    let totalHeatDollar = 0
    let freeRideCount = 0

    for (const trade of openTrades) {
      const sharesHeld = Math.max(
        Number(trade.shares_entered ?? 0) - Number(trade.shares_exited ?? 0),
        0
      )
      const entryPrice = Number(trade.entry_price_actual ?? 0)
      const stopPrice = Number(trade.stop_price_current ?? 0)

      if (stopPrice > entryPrice) {
        freeRideCount += 1
      } else {
        totalHeatDollar += (entryPrice - stopPrice) * sharesHeld
      }
    }

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
    const heatPct =
      parsedPortfolioValue > 0
        ? Number(((totalHeatDollar / parsedPortfolioValue) * 100).toFixed(1))
        : 0

    const heatCeilingPct = Number(market?.max_long_exposure_pct ?? 0)
    const heatRemainingPct = Number(Math.max(0, heatCeilingPct - heatPct).toFixed(1))

    return {
      watchlistCount: watchlist.length,
      openTradesCount: openTrades.length,
      closedTradesCount: closedTrades.length,
      totalRealizedPnl: Number(totalRealizedPnl.toFixed(2)),
      portfolioValue: parsedPortfolioValue,
      openPositionValue: Number(openPositionValue.toFixed(2)),
      exposurePct,
      marketMaxExposurePct,
      heatPct,
      heatCeilingPct,
      heatRemainingPct,
      freeRideCount,
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
      ? 'rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
      : tradeCreationMessage?.type === 'success'
        ? 'rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300'
        : 'rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'

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
        <section className="mx-auto max-w-7xl">
          <AppHeader title="Setup Evaluator" />
          <div className="mt-6 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            Loading dashboard...
          </div>
        </section>
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
              className={`shrink-0 capitalize ${
                activeTab === tab ? 'ui-link-pill-active' : 'ui-link-pill-idle'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
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
              heatPct={metrics.heatPct}
              heatRemainingPct={metrics.heatRemainingPct}
              freeRideCount={metrics.freeRideCount}
            />

            <MarketSummaryCards
              market={market}
              marketPhaseOverride={marketPhaseState}
              stock={stock}
              portfolioValue={portfolioValue}
              setPortfolioValue={setPortfolioValue}
            />

            <CollapsibleSection
              title="Market snapshot"
              subtitle="Update market phase, exposure cap, and current market context."
              defaultOpen={false}
            >
              <MarketSnapshotForm
                key={`${market?.snapshot_date}-${marketPhaseState}-${marketExposureState}`}
                onSave={handleSaveMarketSnapshot}
                initialDate={market?.snapshot_date ?? null}
                initialPhase={marketPhaseState}
                initialExposure={marketExposureState}
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Apply market snapshot from ChatGPT"
              subtitle="Use ChatGPT output to set market phase and exposure quickly."
              defaultOpen={false}
            >
              <MarketSnapshotChatGPTWorkflow
                onApplySuccess={(applyResult) => {
                  setMarketPhaseOverride(applyResult.market_phase)
                  setMarketExposureOverride(applyResult.max_long_exposure_pct)
                }}
              />
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="space-y-4">
            <div className="ui-card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  Watchlist workspace
                </div>
                <p className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                  Select a stock, evaluate the setup, and generate a trade plan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWatchlistFormOpen(true)}
                className="ui-btn-primary shrink-0"
              >
                Add stock
              </button>
            </div>

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
                    industry_group_rank: payload.industryRank
                      ? Number(payload.industryRank)
                      : null,
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

            <CollapsibleSection
              title="Trade actions and exposure preview"
              subtitle="Evaluate, generate a plan, and confirm portfolio exposure impact."
              defaultOpen={true}
            >
              <div className="space-y-4">
                <TradeActionButtons
                  canEvaluate={!!market && !!stock && !saving}
                  canGenerate={!!market && !!stock && !!result && result.verdict !== 'fail'}
                  canCreate={
                    !!stock &&
                    !!plan &&
                    !!latestTradePlanId &&
                    plan.approval_status === 'approved'
                  }
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
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Evaluation result"
              subtitle="Rule-based evaluation output for the selected setup."
              defaultOpen={!!result}
            >
              <EvaluationPanel result={result} />
            </CollapsibleSection>

            <CollapsibleSection
              title="Trade plan"
              subtitle="Generated plan, approval status, risk and reward setup."
              defaultOpen={!!plan}
            >
              <TradePlanPanel plan={plan} />
            </CollapsibleSection>

            <CollapsibleSection
              title="Saved trade plans"
              subtitle="Previously generated plans for later review."
              defaultOpen={false}
            >
              <SavedTradePlansTable savedPlans={savedPlans} />
            </CollapsibleSection>

            <BottomSheet
              open={watchlistFormOpen}
              onClose={() => setWatchlistFormOpen(false)}
              title="Add watchlist stock"
            >
              <AddWatchlistStockForm
                onAdd={async (...args) => {
                  await handleAddWatchlistStock(...args)
                  setWatchlistFormOpen(false)
                }}
              />
            </BottomSheet>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="space-y-4">
            <CollapsibleSection
              title="Trade management"
              subtitle="Review open and partial trades and close positions."
              defaultOpen={true}
            >
              <TradeManagementTable
                savedTrades={savedTrades}
                onCloseTrade={handleCloseTrade}
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Stop updates"
              subtitle="Adjust stops for active positions."
              defaultOpen={false}
            >
              <StopUpdateTable
                savedTrades={savedTrades}
                onUpdateStop={handleUpdateStop}
              />
            </CollapsibleSection>

            <CollapsibleSection
              title="Partial exits"
              subtitle="Take partial profits while keeping the trade active."
              defaultOpen={false}
            >
              <PartialExitTable
                savedTrades={savedTrades}
                onPartialExit={handlePartialExit}
              />
            </CollapsibleSection>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-4">
            <CollapsibleSection
              title="Rule audit"
              subtitle="Recent rule checks and system audit output."
              defaultOpen={true}
            >
              <RuleAuditTable rows={ruleAuditRows} />
            </CollapsibleSection>
          </div>
        )}
      </section>
    </main>
  )
}