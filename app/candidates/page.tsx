'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { supabase as browserSupabase } from '@/lib/supabase'

type WatchlistRow = {
  id: string
  ticker: string
  company_name: string | null
  source: 'manual' | 'automation'
  signal_state: string | null
  eps_growth_pct: number | null
  revenue_growth_pct: number | null
  setup_grade: 'A+' | 'A' | 'B' | 'C' | null
  trend_template_pass: boolean | null
  rs_line_confirmed: boolean | null
  base_pattern_valid: boolean | null
  entry_near_pivot: boolean | null
  volume_dry_up_pass: boolean | null
  volume_breakout_confirmed: boolean | null
  earnings_within_2_weeks: boolean | null
  binary_event_risk: boolean | null
  acc_dist_rating: 'A' | 'B' | 'C' | 'D' | 'E' | null
  industry_group_rank: number | null
  entry_zone_low: number | null
  entry_zone_high: number | null
  stop_price: number | null
  target_1_price: number | null
  target_2_price: number | null
}

type ScreenerSettings = {
  screener_enabled: boolean | null
}

type ScanLogRow = {
  started_at: string | null
}

function buildClipboardContent(candidates: WatchlistRow[]): string {
  const today = new Date().toISOString().slice(0, 10)

  const json = JSON.stringify(
    candidates.map((c) => ({
      id: c.id,
      ticker: c.ticker,
      company_name: c.company_name,
      eps_growth_pct: c.eps_growth_pct,
      revenue_growth_pct: c.revenue_growth_pct,
      setup_grade: c.setup_grade,
      trend_template_pass: c.trend_template_pass,
      rs_line_confirmed: c.rs_line_confirmed,
      base_pattern_valid: c.base_pattern_valid,
      entry_near_pivot: c.entry_near_pivot,
      volume_dry_up_pass: c.volume_dry_up_pass,
      volume_breakout_confirmed: c.volume_breakout_confirmed,
      earnings_within_2_weeks: c.earnings_within_2_weeks,
      binary_event_risk: c.binary_event_risk,
      acc_dist_rating: c.acc_dist_rating,
      industry_group_rank: c.industry_group_rank,
      entry_zone_low: c.entry_zone_low,
      entry_zone_high: c.entry_zone_high,
      stop_price: c.stop_price,
      target_1_price: c.target_1_price,
      target_2_price: c.target_2_price,
    })),
    null,
    2
  )

  const prompt = `You are a professional swing trading research analyst specialising in Mark Minervini's SEPA methodology. I will give you a JSON array of stock candidates that my automated screener has identified based on fundamental criteria. Your job is to research each stock and fill in the missing technical and situational fields so my trading system can run a full rule evaluation.

STRICT OUTPUT RULES:
- Return ONLY a valid JSON object with the exact same structure as the input. No markdown, no explanation, no backticks, no preamble.
- Do not change any field that already contains a non-null value.
- Do not add, rename, or remove any fields.
- Preserve every "id" field exactly as provided — these are database primary keys.
- If you cannot determine a value with reasonable confidence, return null. Do not guess.

FIELD DEFINITIONS — fill these in for each candidate:

setup_grade (string: "A+", "A", "B", or "C")
  Overall quality grade of the current setup. A+ = near-perfect conditions, tight base, strong RS, ideal pivot. C = marginal setup with weaknesses.

trend_template_pass (boolean)
  True only if ALL 8 of Minervini's trend template criteria are met:
  1. Price above 150-day and 200-day MA
  2. 150-day MA above 200-day MA
  3. 200-day MA trending up for at least 1 month
  4. 50-day MA above both 150-day and 200-day MA
  5. Price above 50-day MA
  6. Price at least 25% above its 52-week low
  7. Price within 25% of its 52-week high
  8. RS Rating of 70 or higher
  Return false if any single criterion is not met.

rs_line_confirmed (boolean)
  True if the RS line is at or near a 52-week high, ideally making new highs before or with price.

base_pattern_valid (boolean)
  True if forming or recently completed a SEPA base: cup with handle, flat base, VCP, or double bottom. Base must be at least 3 weeks long.

entry_near_pivot (boolean)
  True if current price is within 5% above the pivot point. False if extended more than 5% or not yet at pivot.

volume_dry_up_pass (boolean)
  True if volume has contracted to below-average levels during the right side of the base or handle, at least 2-3 consecutive weeks of declining volume near pivot.

volume_breakout_confirmed (boolean)
  True if a breakout has already occurred on volume at least 40-50% above the 50-day average. False if no breakout yet or weak volume breakout.

earnings_within_2_weeks (boolean)
  True if next earnings announcement is within 14 calendar days from today.

binary_event_risk (boolean)
  True if a known near-term binary event exists: FDA decision, major legal ruling, clinical trial results, or similar.

acc_dist_rating (string: "A", "B", "C", "D", or "E")
  Institutional accumulation/distribution proxy based on observable up-volume vs down-volume over the past 13 weeks.

industry_group_rank (integer: 1 to 197)
  IBD industry group rank approximation. Top-performing groups rank 1-40. Weak groups rank 150-197.

entry_zone_low (number)
  Lower bound of ideal buy zone in dollars, at or just above pivot. Round to 2 decimal places.

entry_zone_high (number)
  Upper bound of ideal buy zone. Maximum 5% above entry_zone_low. Round to 2 decimal places.

stop_price (number)
  Initial stop loss based on chart structure. Must be below entry_zone_low. Risk no more than 7-8% from entry. Round to 2 decimal places.

target_1_price (number)
  First profit target. Must produce reward-to-risk of at least 2:1 relative to entry_zone_low and stop_price. Round to 2 decimal places.

target_2_price (number or null)
  Second extended profit target if a clear level exists. Null if no meaningful second target. Round to 2 decimal places.

TODAY'S DATE: ${today}

CANDIDATES JSON:
${json}`

  return prompt
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function isReady(candidate: WatchlistRow) {
  return [
    candidate.setup_grade,
    candidate.trend_template_pass,
    candidate.rs_line_confirmed,
    candidate.base_pattern_valid,
    candidate.entry_near_pivot,
    candidate.volume_dry_up_pass,
    candidate.volume_breakout_confirmed,
    candidate.earnings_within_2_weeks,
    candidate.binary_event_risk,
    candidate.acc_dist_rating,
    candidate.industry_group_rank,
    candidate.entry_zone_low,
    candidate.entry_zone_high,
    candidate.stop_price,
    candidate.target_1_price,
  ].every((value) => value !== null)
}

function validateCandidateArray(value: unknown): {
  valid: boolean
  schemaValid: boolean
  count: number
} {
  if (!Array.isArray(value)) {
    return { valid: false, schemaValid: false, count: 0 }
  }

  const count = value.length

  const schemaValid = value.every((row) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return false
    const item = row as Record<string, unknown>
    return typeof item.id === 'string' && typeof item.ticker === 'string'
  })

  return { valid: true, schemaValid, count }
}

async function copyTextWithFallback(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export default function CandidatesPage() {
  const supabase = useMemo(() => browserSupabase, [])

  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<WatchlistRow[]>([])
  const [screenerEnabled, setScreenerEnabled] = useState(false)
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [pasteValue, setPasteValue] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyMessage, setApplyMessage] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)

      const [watchlistResult, settingsResult, logsResult] = await Promise.all([
        supabase
          .from('watchlist')
          .select(
            'id, ticker, company_name, source, signal_state, eps_growth_pct, revenue_growth_pct, setup_grade, trend_template_pass, rs_line_confirmed, base_pattern_valid, entry_near_pivot, volume_dry_up_pass, volume_breakout_confirmed, earnings_within_2_weeks, binary_event_risk, acc_dist_rating, industry_group_rank, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price'
          )
          .eq('source', 'automation')
          .eq('signal_state', 'candidate')
          .order('ticker'),
        supabase
          .from('user_settings')
          .select('screener_enabled')
          .limit(1)
          .maybeSingle(),
        supabase
          .from('scan_logs')
          .select('started_at')
          .eq('job_type', 'watchlist-screener')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelled) return

      setCandidates((watchlistResult.data as WatchlistRow[] | null) ?? [])
      setScreenerEnabled(
        ((settingsResult.data as ScreenerSettings | null)?.screener_enabled) ?? false
      )
      setLastRunAt(((logsResult.data as ScanLogRow | null)?.started_at) ?? null)
      setLoading(false)
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [supabase])

  useEffect(() => {
    if (copyState !== 'copied') return
    const timeout = window.setTimeout(() => setCopyState('idle'), 2000)
    return () => window.clearTimeout(timeout)
  }, [copyState])

  const clipboardContent = buildClipboardContent(candidates)
  const previewText = clipboardContent.split('\n').slice(0, 3).join('\n')
  const awaitingResearchCount = candidates.filter((candidate) => !isReady(candidate)).length
  const readyCount = candidates.filter((candidate) => isReady(candidate)).length

  let validationState: 'empty' | 'valid' | 'invalid' | 'schema' = 'empty'
  let validationCount = 0
  let parsedBody: unknown = null

  if (pasteValue.trim()) {
    try {
      parsedBody = JSON.parse(pasteValue)
      const result = validateCandidateArray(parsedBody)
      validationCount = result.count
      validationState = result.valid ? (result.schemaValid ? 'valid' : 'schema') : 'invalid'
    } catch {
      validationState = 'invalid'
    }
  }

  const handleCopy = async () => {
    try {
      setApplyError(null)
      await copyTextWithFallback(clipboardContent)
      setCopyState('copied')
    } catch {
      setApplyError('Failed to copy to clipboard.')
    }
  }

  const handleApply = async () => {
    if (validationState !== 'valid') return

    setApplyLoading(true)
    setApplyMessage(null)
    setApplyError(null)

    const response = await fetch('/api/watchlist/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsedBody),
    })

    const result = await response.json()

    if (!response.ok) {
      setApplyError(result.error ?? 'Failed to apply candidate updates.')
      setApplyLoading(false)
      return
    }

    setApplyMessage(`${result.updated} candidates updated successfully.`)
    setPasteValue('')
    setApplyLoading(false)

    const { data } = await supabase
      .from('watchlist')
      .select(
        'id, ticker, company_name, source, signal_state, eps_growth_pct, revenue_growth_pct, setup_grade, trend_template_pass, rs_line_confirmed, base_pattern_valid, entry_near_pivot, volume_dry_up_pass, volume_breakout_confirmed, earnings_within_2_weeks, binary_event_risk, acc_dist_rating, industry_group_rank, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price'
      )
      .eq('source', 'automation')
      .eq('signal_state', 'candidate')
      .order('ticker')

    setCandidates((data as WatchlistRow[] | null) ?? [])
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          title="Candidates"
          subtitle="Review screener candidates, export to ChatGPT for research, and import the results."
        />

        {loading ? (
          <div className="space-y-6">
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100" />
            <div className="h-64 animate-pulse rounded-xl bg-neutral-100" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Awaiting research
                </div>
                <div className="mt-2 text-3xl font-semibold text-neutral-900">
                  {awaitingResearchCount}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Ready for evaluation
                </div>
                <div className="mt-2 text-3xl font-semibold text-neutral-900">
                  {readyCount}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Last screener run
                </div>
                <div className="mt-2 text-sm font-medium text-neutral-900">
                  {formatDateTime(lastRunAt)}
                </div>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
                <h2 className="text-lg font-semibold text-neutral-900">No candidates yet.</h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Enable the screener in Settings and it will run tonight.
                </p>
                {!screenerEnabled ? (
                  <p className="mt-3 text-xs text-neutral-500">
                    Screener is currently disabled.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-neutral-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Step 1 — Copy to ChatGPT
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600">
                    Click copy. Open ChatGPT. Paste. The prompt and candidate data are included.
                  </p>
                  <p className="mt-4 text-sm font-medium text-neutral-900">
                    {candidates.length} candidates included
                  </p>

                  <textarea
                    readOnly
                    value={previewText}
                    className="mt-4 h-32 w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-xs text-neutral-500"
                  />

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="ui-btn-primary mt-4"
                  >
                    {copyState === 'copied' ? 'Copied!' : 'Copy prompt + data'}
                  </button>
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-6">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Step 2 — Paste ChatGPT output
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600">
                    Paste the JSON that ChatGPT returned. Click Apply to update all candidates at once.
                  </p>

                  <textarea
                    value={pasteValue}
                    onChange={(event) => setPasteValue(event.target.value)}
                    placeholder="Paste ChatGPT's JSON output here..."
                    className="mt-4 h-48 w-full rounded-xl border border-neutral-200 p-4 text-sm text-neutral-800"
                  />

                  <div className="mt-3">
                    {validationState === 'valid' ? (
                      <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        Valid JSON — {validationCount} candidates ready to apply
                      </span>
                    ) : null}

                    {validationState === 'invalid' ? (
                      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                        Invalid JSON — check the output and try again
                      </span>
                    ) : null}

                    {validationState === 'schema' ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        JSON structure does not match expected format
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    disabled={validationState !== 'valid' || applyLoading}
                    onClick={handleApply}
                    className="ui-btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {applyLoading ? 'Applying...' : 'Apply update'}
                  </button>

                  {applyMessage ? (
                    <p className="mt-3 text-sm text-green-600">{applyMessage}</p>
                  ) : null}

                  {applyError ? (
                    <p className="mt-3 text-sm text-red-600">{applyError}</p>
                  ) : null}
                </section>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}