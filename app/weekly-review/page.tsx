'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AppHeader } from '@/components/AppHeader'

type Trade = {
  id: string
  ticker: string
  side: string
  status: string
  entry_date: string | null
  exit_date: string | null
  entry_price_actual: number | null
  exit_price_actual: number | null
  shares_entered: number | null
  pnl_dollar: number | null
  pnl_pct: number | null
}

export default function WeeklyReviewPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  // -----------------------
  // LOAD DATA
  // -----------------------
  useEffect(() => {
    const loadTrades = async () => {
      const { data, error } = await supabase
        .from('trades')
        .select(
          'id, ticker, side, status, entry_date, exit_date, entry_price_actual, exit_price_actual, shares_entered, pnl_dollar, pnl_pct'
        )
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        alert('Failed to load trades')
      } else {
        setTrades(data ?? [])
      }

      setLoading(false)
    }

    void loadTrades()
  }, [])

  // -----------------------
  // FILTER LAST 7 DAYS
  // -----------------------
  const last7DaysTrades = useMemo(() => {
    const today = new Date()
    const past = new Date()
    past.setDate(today.getDate() - 7)

    return trades.filter((t) => {
      if (!t.exit_date) return false
      const exitDate = new Date(t.exit_date)
      return exitDate >= past && exitDate <= today
    })
  }, [trades])

  // -----------------------
  // METRICS
  // -----------------------
  const metrics = useMemo(() => {
    const totalTrades = last7DaysTrades.length

    const winners = last7DaysTrades.filter((t) => (t.pnl_dollar ?? 0) > 0)
    const losers = last7DaysTrades.filter((t) => (t.pnl_dollar ?? 0) < 0)

    const winRate =
      totalTrades > 0 ? (winners.length / totalTrades) * 100 : 0

    const totalPnl = last7DaysTrades.reduce(
      (sum, t) => sum + (t.pnl_dollar ?? 0),
      0
    )

    const avgWin =
      winners.length > 0
        ? winners.reduce((s, t) => s + (t.pnl_dollar ?? 0), 0) /
          winners.length
        : 0

    const avgLoss =
      losers.length > 0
        ? losers.reduce((s, t) => s + (t.pnl_dollar ?? 0), 0) /
          losers.length
        : 0

    return {
      totalTrades,
      winRate,
      totalPnl,
      avgWin,
      avgLoss,
    }
  }, [last7DaysTrades])

  // -----------------------
  // UI
  // -----------------------
  if (loading) {
    return <main className="p-10">Loading weekly review...</main>
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
      <section className="mx-auto max-w-6xl">
        <AppHeader
          title="Weekly Review"
          subtitle="Review your last 7 days of trading performance."
        />

        {/* -----------------------
            METRICS CARDS
        ----------------------- */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <MetricCard label="Trades" value={metrics.totalTrades} />
          <MetricCard
            label="Win Rate"
            value={`${metrics.winRate.toFixed(1)}%`}
          />
          <MetricCard
            label="Total P&L"
            value={`$${metrics.totalPnl.toFixed(2)}`}
          />
          <MetricCard
            label="Avg Win"
            value={`$${metrics.avgWin.toFixed(2)}`}
          />
          <MetricCard
            label="Avg Loss"
            value={`$${metrics.avgLoss.toFixed(2)}`}
          />
        </div>

        {/* -----------------------
            TABLE
        ----------------------- */}
        <div className="mt-8 overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left">Ticker</th>
                <th className="px-4 py-3 text-left">Entry</th>
                <th className="px-4 py-3 text-left">Exit</th>
                <th className="px-4 py-3 text-left">Shares</th>
                <th className="px-4 py-3 text-left">P&L</th>
                <th className="px-4 py-3 text-left">P&L %</th>
              </tr>
            </thead>

            <tbody>
              {last7DaysTrades.map((trade) => {
                const isWin = (trade.pnl_dollar ?? 0) > 0

                return (
                  <tr key={trade.id} className="border-t">
                    <td className="px-4 py-3">{trade.ticker}</td>
                    <td className="px-4 py-3">
                      {trade.entry_price_actual}
                    </td>
                    <td className="px-4 py-3">
                      {trade.exit_price_actual}
                    </td>
                    <td className="px-4 py-3">
                      {trade.shares_entered}
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        isWin ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {trade.pnl_dollar?.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        isWin ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {trade.pnl_pct?.toFixed(2)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {last7DaysTrades.length === 0 && (
          <div className="mt-6 text-sm text-neutral-500">
            No trades closed in the last 7 days.
          </div>
        )}
      </section>
    </main>
  )
}

// -----------------------
// SMALL COMPONENT
// -----------------------
function MetricCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}