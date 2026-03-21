'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WeeklyReviewSummary } from '@/components/WeeklyReviewSummary'
import { AppHeader } from '@/components/AppHeader'

type MarketSnapshot = {
  id: string
  market_phase: string
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
}

export default function WeeklyReviewPage() {
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [trades, setTrades] = useState<TradeRow[]>([])
  const [primaryFocus, setPrimaryFocus] = useState('')
  const [biggestRuleIssue, setBiggestRuleIssue] = useState('')
  const [nextWeekTriggers, setNextWeekTriggers] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const [
        { data: marketData, error: marketError },
        { data: tradeData, error: tradeError },
      ] = await Promise.all([
        supabase
          .from('market_snapshots')
          .select('id, market_phase')
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('trades')
          .select(
            'id, ticker, status, pnl_dollar, pnl_pct, entry_date, exit_date, exit_price_actual'
          )
          .order('created_at', { ascending: false })
          .limit(100),
      ])

      if (marketError) console.error('Market load error:', marketError)
      if (tradeError) console.error('Trade load error:', tradeError)

      setMarket(marketData ?? null)
      setTrades(tradeData ?? [])
      setLoading(false)
    }

    loadData()
  }, [])

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

    const { error } = await supabase.from('weekly_reviews').insert({
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
    })

    if (error) {
      console.error(error)
      alert('Failed to save weekly review')
      return
    }

    alert('Weekly review saved')
  }

  if (loading) {
    return <main className="p-10">Loading weekly review...</main>
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <section className="mx-auto max-w-6xl">
        <AppHeader
          title="Weekly Review"
          subtitle="Review outcomes, performance, and next-week focus."
          rightLinkHref="/"
          rightLinkLabel="Back to Dashboard"
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

        <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
          <h2 className="text-lg font-semibold">Closed Trades</h2>

          {metrics.closedTrades.length === 0 ? (
            <p className="mt-4 text-neutral-600">No closed trades yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-3 pr-4">Ticker</th>
                    <th className="py-3 pr-4">Entry Date</th>
                    <th className="py-3 pr-4">Exit Date</th>
                    <th className="py-3 pr-4">Exit Price</th>
                    <th className="py-3 pr-4">P&amp;L $</th>
                    <th className="py-3 pr-4">P&amp;L %</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.closedTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-neutral-100">
                      <td className="py-3 pr-4 font-medium">{trade.ticker}</td>
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

        <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
          <h2 className="text-lg font-semibold">Weekly Review Notes</h2>

          <div className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Primary Focus for Next Week
              </label>
              <input
                value={primaryFocus}
                onChange={(e) => setPrimaryFocus(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Focus on A-grade setups only"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Biggest Rule Issue
              </label>
              <input
                value={biggestRuleIssue}
                onChange={(e) => setBiggestRuleIssue(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Entered too far from pivot"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Next Week Triggers
              </label>
              <input
                value={nextWeekTriggers}
                onChange={(e) => setNextWeekTriggers(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Watch for confirmed_uptrend continuation"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-32 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Weekly reflection..."
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleSaveWeeklyReview}
              className="rounded-xl border border-neutral-900 px-5 py-3 text-sm font-medium"
            >
              Save Weekly Review
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}