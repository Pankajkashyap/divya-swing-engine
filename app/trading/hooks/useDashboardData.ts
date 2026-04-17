import { useCallback, useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/app/trading/lib/supabase'
import type {
  MarketSnapshot,
  WatchlistRow,
  SavedTradePlan,
  SavedTrade,
  RuleAuditRow,
} from '@/app/trading/types/dashboard'

export function useDashboardData() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [stock, setStock] = useState<WatchlistRow | null>(null)
  const [watchlist, setWatchlist] = useState<WatchlistRow[]>([])
  const [savedPlans, setSavedPlans] = useState<SavedTradePlan[]>([])
  const [savedTrades, setSavedTrades] = useState<SavedTrade[]>([])
  const [ruleAuditRows, setRuleAuditRows] = useState<RuleAuditRow[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    const [
      { data: marketData, error: marketError },
      { data: watchlistData, error: watchlistError },
      { data: tradePlanData, error: tradePlanError },
      { data: tradeData, error: tradeError },
      { data: ruleAuditData, error: ruleAuditError },
    ] = await Promise.all([
      supabase
        .from('market_snapshots')
        .select('id, market_phase, max_long_exposure_pct, snapshot_date, ftd_active, ftd_confidence')        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('watchlist')
        .select(
          'id, ticker, company_name, source, setup_grade, trend_template_pass, volume_dry_up_pass, earnings_within_2_weeks, binary_event_risk, pivot_price, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price, rs_line_confirmed, base_pattern_valid, entry_near_pivot, volume_breakout_confirmed, liquidity_pass, eps_growth_pct, eps_accelerating, revenue_growth_pct, acc_dist_rating, industry_group_rank'
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
          'id, ticker, side, status, entry_date, entry_price_actual, shares_entered, stop_price_initial, stop_price_current, target_1_price, target_2_price, shares_exited, exit_date, exit_price_actual, pnl_dollar, pnl_pct'
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
  }, [supabase])

  useEffect(() => {
    const load = async () => {
      await loadDashboardData()
      setLoading(false)
    }

    void load()
  }, [loadDashboardData])

  return {
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
  }
}