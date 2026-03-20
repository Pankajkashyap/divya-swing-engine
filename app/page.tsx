'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type MarketSnapshot = {
  id: string
  snapshot_date: string
  market_phase: string
  spx_distribution_days: number
  ndx_distribution_days: number
  breakout_success_rate_pct: number | null
  max_long_exposure_pct: number | null
  notes: string | null
}

type WatchlistRow = {
  id: string
  ticker: string
  company_name: string | null
  setup_type: string
  base_pattern: string | null
  setup_grade: string | null
  rr_ratio: number | null
  action_status: string
}

export default function HomePage() {
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [watchlist, setWatchlist] = useState<WatchlistRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      const [{ data: marketData, error: marketError }, { data: watchlistData, error: watchlistError }] =
        await Promise.all([
          supabase
            .from('market_snapshots')
            .select('*')
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('watchlist')
            .select('id, ticker, company_name, setup_type, base_pattern, setup_grade, rr_ratio, action_status')
            .order('created_at', { ascending: false })
            .limit(10),
        ])

      if (marketError) {
        console.error('Market snapshot error:', marketError)
      }

      if (watchlistError) {
        console.error('Watchlist error:', watchlistError)
      }

      setMarket(marketData ?? null)
      setWatchlist(watchlistData ?? [])
      setLoading(false)
    }

    loadDashboard()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-neutral-900">
        <p>Loading Divya Swing Engine...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Divya Swing Engine
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Rule-based swing trading dashboard
          </h1>
          <p className="mt-3 max-w-3xl text-neutral-600">
            Market-first workflow, setup evaluation, trade planning, and disciplined execution.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-sm font-medium text-neutral-500">Market Phase</h2>
            <p className="mt-2 text-2xl font-semibold">
              {market?.market_phase ?? 'No data'}
            </p>
            <p className="mt-3 text-sm text-neutral-600">
              Snapshot date: {market?.snapshot_date ?? '—'}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-sm font-medium text-neutral-500">Distribution Days</h2>
            <p className="mt-2 text-2xl font-semibold">
              SPX {market?.spx_distribution_days ?? '—'} / NDX {market?.ndx_distribution_days ?? '—'}
            </p>
            <p className="mt-3 text-sm text-neutral-600">
              Breakout success: {market?.breakout_success_rate_pct ?? '—'}%
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-5">
            <h2 className="text-sm font-medium text-neutral-500">Max Long Exposure</h2>
            <p className="mt-2 text-2xl font-semibold">
              {market?.max_long_exposure_pct ?? '—'}%
            </p>
            <p className="mt-3 text-sm text-neutral-600">
              {market?.notes ?? 'No notes'}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-neutral-200 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Watchlist</h2>
            <p className="text-sm text-neutral-500">{watchlist.length} records</p>
          </div>

          {watchlist.length === 0 ? (
            <p className="text-neutral-600">No watchlist names yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-3 pr-4">Ticker</th>
                    <th className="py-3 pr-4">Company</th>
                    <th className="py-3 pr-4">Setup</th>
                    <th className="py-3 pr-4">Base</th>
                    <th className="py-3 pr-4">Grade</th>
                    <th className="py-3 pr-4">R/R</th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map((row) => (
                    <tr key={row.id} className="border-b border-neutral-100">
                      <td className="py-3 pr-4 font-medium">{row.ticker}</td>
                      <td className="py-3 pr-4">{row.company_name ?? '—'}</td>
                      <td className="py-3 pr-4">{row.setup_type}</td>
                      <td className="py-3 pr-4">{row.base_pattern ?? '—'}</td>
                      <td className="py-3 pr-4">{row.setup_grade ?? '—'}</td>
                      <td className="py-3 pr-4">{row.rr_ratio ?? '—'}</td>
                      <td className="py-3 pr-4">{row.action_status}</td>
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