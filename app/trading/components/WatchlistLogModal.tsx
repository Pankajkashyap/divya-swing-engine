'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/app/trading/lib/supabase'

type Props = {
  ticker: string
  watchlistId: string
  onClose: () => void
}

type WatchlistMeta = {
  created_at: string | null
  source: string | null
  screener_run_id: string | null
  screened_price: number | null
  screened_avg_volume: number | null
  screened_eps_growth_pct: number | null
  screened_revenue_growth_pct: number | null
  screened_at: string | null
}

type EvaluationRow = {
  id: string
  evaluation_date: string | null
  verdict: string | null
  score_total: number | null
  fail_reason: string | null
  notes: string | null
}

type TradePlanRow = {
  id: string
  plan_date: string | null
  side: string | null
  entry_price: number | null
  stop_price: number | null
  final_shares: number | null
  final_position_value: number | null
  expected_rr: number | null
  approval_status: string | null
  blocked_reason: string | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString()
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return `$${Number(value).toLocaleString()}`
}

function verdictPillClass(verdict: string | null) {
  if (verdict === 'pass') return 'ui-pill-success'
  if (verdict === 'watch') return 'ui-pill-warning'
  if (verdict === 'fail') return 'ui-pill-danger'
  return 'ui-pill-neutral'
}

function statusPillClass(status: string | null) {
  if (status === 'approved') return 'ui-pill-success'
  if (status === 'blocked') return 'ui-pill-danger'
  if (status === 'executed') {
    return 'inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300'
  }
  return 'ui-pill-neutral'
}

export function WatchlistLogModal({ ticker, watchlistId, onClose }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [watchlistMeta, setWatchlistMeta] = useState<WatchlistMeta | null>(null)
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([])
  const [tradePlans, setTradePlans] = useState<TradePlanRow[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const [watchlistResult, evaluationsResult, tradePlansResult] = await Promise.all([
        supabase
          .from('watchlist')
          .select(
            'created_at, source, screener_run_id, screened_price, screened_avg_volume, screened_eps_growth_pct, screened_revenue_growth_pct, screened_at'
          )
          .eq('id', watchlistId)
          .maybeSingle(),
        supabase
          .from('setup_evaluations')
          .select('id, evaluation_date, verdict, score_total, fail_reason, notes')
          .eq('watchlist_id', watchlistId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('trade_plans')
          .select(
            'id, plan_date, side, entry_price, stop_price, final_shares, final_position_value, expected_rr, approval_status, blocked_reason'
          )
          .eq('watchlist_id', watchlistId)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (cancelled) return

      if (watchlistResult.error || evaluationsResult.error || tradePlansResult.error) {
        setError(
          watchlistResult.error?.message ||
            evaluationsResult.error?.message ||
            tradePlansResult.error?.message ||
            'Failed to load history.'
        )
        setLoading(false)
        return
      }

      setWatchlistMeta((watchlistResult.data as WatchlistMeta | null) ?? null)
      setEvaluations((evaluationsResult.data ?? []) as EvaluationRow[])
      setTradePlans((tradePlansResult.data ?? []) as TradePlanRow[])
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase, watchlistId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-6 text-neutral-900 shadow-2xl dark:bg-[#1a1f2e] dark:text-[#e6eaf0]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">History — {ticker}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 transition hover:text-neutral-700 dark:text-[#a8b2bf] dark:hover:text-[#e6eaf0]"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-neutral-600 dark:text-[#a8b2bf]">Loading history...</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-[#f0a3a3]">{error}</p>
        ) : (
          <div className="space-y-8">
            <section>
              <h3 className="mb-3 text-lg font-semibold">How it arrived</h3>

              <div className="ui-card p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-[#a8b2bf]">Added date</p>
                    <p className="mt-1 text-sm">{formatDate(watchlistMeta?.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-[#a8b2bf]">Source</p>
                    <p className="mt-1 text-sm">
                      {watchlistMeta?.source === 'automation' ? 'Automation' : 'Manual'}
                    </p>
                  </div>
                </div>

                {watchlistMeta?.source === 'automation' ? (
                  <>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-[#a8b2bf]">Screener run ID</p>
                        <p className="mt-1 text-sm">
                          {watchlistMeta.screener_run_id
                            ? `${watchlistMeta.screener_run_id.slice(0, 8)}...`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-[#a8b2bf]">Screened at</p>
                        <p className="mt-1 text-sm">{formatDate(watchlistMeta.screened_at)}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="ui-card p-4">
                        <p className="text-xs text-neutral-500 dark:text-[#a8b2bf]">Price at screening</p>
                        <p className="mt-1 text-lg font-semibold">
                          {formatPrice(watchlistMeta.screened_price)}
                        </p>
                      </div>
                      <div className="ui-card p-4">
                        <p className="text-xs text-neutral-500 dark:text-[#a8b2bf]">Volume at screening</p>
                        <p className="mt-1 text-lg font-semibold">
                          {formatNumber(watchlistMeta.screened_avg_volume)}
                        </p>
                      </div>
                      <div className="ui-card p-4">
                        <p className="text-xs text-neutral-500 dark:text-[#a8b2bf]">EPS growth %</p>
                        <p className="mt-1 text-lg font-semibold">
                          {watchlistMeta.screened_eps_growth_pct != null
                            ? `${watchlistMeta.screened_eps_growth_pct}%`
                            : '—'}
                        </p>
                      </div>
                      <div className="ui-card p-4">
                        <p className="text-xs text-neutral-500 dark:text-[#a8b2bf]">Revenue growth %</p>
                        <p className="mt-1 text-lg font-semibold">
                          {watchlistMeta.screened_revenue_growth_pct != null
                            ? `${watchlistMeta.screened_revenue_growth_pct}%`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-lg font-semibold">Evaluations</h3>

              {evaluations.length === 0 ? (
                <p className="text-sm text-neutral-600 dark:text-[#a8b2bf]">No evaluations run yet.</p>
              ) : (
                <div className="ui-table-wrap">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Verdict</th>
                        <th>Score</th>
                        <th>Fail Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDate(row.evaluation_date)}</td>
                          <td>
                            <span className={verdictPillClass(row.verdict)}>
                              {row.verdict ?? '—'}
                            </span>
                          </td>
                          <td>{row.score_total ?? '—'}</td>
                          <td>{row.fail_reason ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-3 text-lg font-semibold">Trade Plans</h3>

              {tradePlans.length === 0 ? (
                <p className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                  No trade plans generated yet.
                </p>
              ) : (
                <div className="ui-table-wrap">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Entry</th>
                        <th>Stop</th>
                        <th>R/R</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradePlans.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDate(row.plan_date)}</td>
                          <td>{formatPrice(row.entry_price)}</td>
                          <td>{formatPrice(row.stop_price)}</td>
                          <td>{row.expected_rr ?? '—'}</td>
                          <td>
                            <span className={statusPillClass(row.approval_status)}>
                              {row.approval_status ?? '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}