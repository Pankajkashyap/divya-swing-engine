'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { AppHeader } from '@/components/AppHeader'
import { Tooltip } from '@/components/ui/Tooltip'

type CandidateRow = {
  id: string
  ticker: string
  company_name: string | null
  source: string
  signal_state: string | null
  eps_growth_pct: number | null
  revenue_growth_pct: number | null
  setup_grade: string | null
  trend_template_pass: boolean | null
  rs_line_confirmed: boolean | null
  base_pattern_valid: boolean | null
  entry_near_pivot: boolean | null
  volume_dry_up_pass: boolean | null
  volume_breakout_confirmed: boolean | null
  earnings_within_2_weeks: boolean | null
  binary_event_risk: boolean | null
  acc_dist_rating: string | null
  industry_group_rank: number | null
  entry_zone_low: number | null
  entry_zone_high: number | null
  stop_price: number | null
  target_1_price: number | null
  target_2_price: number | null
}

type ScanLogRow = {
  started_at: string
}

type UserSettings = {
  screener_enabled: boolean
}

type BulkUpdateResult = {
  updated: number
  rejected: number
  skipped: number
  failed: number
  errors: Array<{ id?: string; ticker?: string; message: string }>
}

function isCandidateReadyForEvaluation(candidate: CandidateRow): boolean {
  return (
    candidate.setup_grade !== null &&
    candidate.trend_template_pass !== null &&
    candidate.rs_line_confirmed !== null &&
    candidate.base_pattern_valid !== null &&
    candidate.entry_near_pivot !== null &&
    candidate.volume_dry_up_pass !== null &&
    candidate.volume_breakout_confirmed !== null &&
    candidate.earnings_within_2_weeks !== null &&
    candidate.binary_event_risk !== null &&
    candidate.acc_dist_rating !== null &&
    candidate.industry_group_rank !== null
  )
}

function isValidImportedRow(row: unknown): row is Record<string, unknown> {
  return (
    typeof row === 'object' &&
    row !== null &&
    typeof (row as { id?: unknown }).id === 'string'
  )
}

function buildClipboardContent(candidates: CandidateRow[]): string {
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

CANDIDATE QUALITY RULES:
- Before researching any candidate, assess whether it is a real 
  operating business with a tradeable chart.
- If a candidate is a SPAC, shell company, blank check company, 
  acquisition vehicle, ADR with no US listing, ETF, warrant, or 
  any non-operating entity — set setup_grade to "F" and leave all 
  price fields (entry_zone_low, entry_zone_high, stop_price, 
  target_1_price, target_2_price) as null. Set all boolean fields 
  to false. Do not attempt chart research for these.
- If a candidate has eps_growth_pct of 0 or null AND 
  revenue_growth_pct of 0 or null — set setup_grade to "F". 
  These are unresearchable from a fundamental standpoint.
- Only populate entry_zone_low, entry_zone_high, stop_price, and 
  target_1_price if BOTH trend_template_pass is true AND 
  base_pattern_valid is true. If either is false or null, leave 
  all price fields as null.
- A setup_grade of "F" means the candidate will be automatically 
  rejected and not imported into the system.

FIELD DEFINITIONS — fill these in for each candidate:

setup_grade (string: "A+", "A", "B", "C", or "F")
  Overall quality grade of the current setup.
  A+ = near-perfect conditions, tight base, strong RS, ideal pivot.
  A  = strong setup with minor imperfections.
  B  = decent setup, tradeable but not ideal.
  C  = marginal setup with notable weaknesses.
  F  = unresearchable or disqualified candidate. See quality rules above.

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

async function copyTextWithFallback(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  document.execCommand('copy')
  document.body.removeChild(textArea)
}

export default function CandidatesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [screenerEnabled, setScreenerEnabled] = useState(false)
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [copySuccess, setCopySuccess] = useState(false)
  const [importText, setImportText] = useState('')
  const [parsedImport, setParsedImport] = useState<Record<string, unknown>[] | null>(null)
  const [importValidation, setImportValidation] = useState<
    'empty' | 'valid' | 'invalid' | 'schema'
  >('empty')
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const [{ data: candidateData }, { data: settingsData }, { data: scanLogsData }] =
        await Promise.all([
          supabase
            .from('watchlist')
            .select(`
            id,
            ticker,
            company_name,
            source,
            signal_state,
            eps_growth_pct,
            revenue_growth_pct,
            setup_grade,
            trend_template_pass,
            rs_line_confirmed,
            base_pattern_valid,
            entry_near_pivot,
            volume_dry_up_pass,
            volume_breakout_confirmed,
            earnings_within_2_weeks,
            binary_event_risk,
            acc_dist_rating,
            industry_group_rank,
            entry_zone_low,
            entry_zone_high,
            stop_price,
            target_1_price,
            target_2_price
          `)
            .eq('source', 'automation')
            .eq('signal_state', 'candidate')
            .order('created_at', { ascending: false }),
          supabase
            .from('user_settings')
            .select('screener_enabled')
            .maybeSingle<UserSettings>(),
          supabase
            .from('scan_logs')
            .select('started_at')
            .eq('job_type', 'watchlist-screener')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle<ScanLogRow>(),
        ])

      setCandidates((candidateData ?? []) as CandidateRow[])
      setScreenerEnabled(settingsData?.screener_enabled ?? false)
      setLastRunAt(scanLogsData?.started_at ?? null)
      setLoading(false)
    }

    void load()
  }, [supabase])

  useEffect(() => {
    setImportSuccess(null)
    setImportError(null)

    if (!importText.trim()) {
      setImportValidation('empty')
      setParsedImport(null)
      return
    }

    try {
      const parsed = JSON.parse(importText) as unknown

      if (!Array.isArray(parsed)) {
        setImportValidation('schema')
        setParsedImport(null)
        return
      }

      const valid = parsed.every(isCandidateReadyForApply)

      if (!valid) {
        setImportValidation('schema')
        setParsedImport(null)
        return
      }

      setImportValidation('valid')
      setParsedImport(parsed as Record<string, unknown>[])
    } catch {
      setImportValidation('invalid')
      setParsedImport(null)
    }
  }, [importText])

  const awaitingResearchCount = useMemo(
    () =>
      candidates.filter((candidate) => !isCandidateReadyForEvaluation(candidate))
        .length,
    [candidates]
  )

  const readyForEvaluationCount = useMemo(
    () =>
      candidates.filter((candidate) => isCandidateReadyForEvaluation(candidate))
        .length,
    [candidates]
  )

  const clipboardContent = useMemo(
    () => buildClipboardContent(candidates),
    [candidates]
  )
  const clipboardPreview = useMemo(
    () => clipboardContent.split('\n').slice(0, 3).join('\n'),
    [clipboardContent]
  )

  const handleCopy = async () => {
    await copyTextWithFallback(clipboardContent)
    setCopySuccess(true)
    window.setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleApply = async () => {
    if (!parsedImport) return

    setImporting(true)
    setImportSuccess(null)
    setImportError(null)

    try {
      const response = await fetch('/api/watchlist/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedImport),
      })

      const result = (await response.json()) as
        | BulkUpdateResult
        | { error: string }

      if (!response.ok) {
        setImportError(
          'error' in result ? result.error : 'Failed to apply update.'
        )
        setImporting(false)
        return
      }

      const typed = result as BulkUpdateResult
      const msg: string[] = []
      if (typed.updated > 0) msg.push(`${typed.updated} candidates updated`)
      if (typed.rejected > 0)
        msg.push(`${typed.rejected} F-grade candidates removed`)
      setImportSuccess(msg.join('. ') + '.')

      setImportText('')

      const { data: refreshed } = await supabase
        .from('watchlist')
        .select(`
          id,
          ticker,
          company_name,
          source,
          signal_state,
          eps_growth_pct,
          revenue_growth_pct,
          setup_grade,
          trend_template_pass,
          rs_line_confirmed,
          base_pattern_valid,
          entry_near_pivot,
          volume_dry_up_pass,
          volume_breakout_confirmed,
          earnings_within_2_weeks,
          binary_event_risk,
          acc_dist_rating,
          industry_group_rank,
          entry_zone_low,
          entry_zone_high,
          stop_price,
          target_1_price,
          target_2_price
        `)
        .eq('source', 'automation')
        .eq('signal_state', 'candidate')
        .order('created_at', { ascending: false })

      setCandidates((refreshed ?? []) as CandidateRow[])
    } catch {
      setImportError('Failed to apply update.')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <main className="ui-page">
        <section className="mx-auto max-w-7xl">
        <AppHeader title="Candidates" />
          <div className="mt-8 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            Loading candidates...
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="ui-page">
      <section className="mx-auto max-w-7xl">
      <AppHeader title="Candidates" />

        {!screenerEnabled && candidates.length === 0 ? (
          <div className="ui-section mt-8 text-neutral-700 dark:text-[#a8b2bf]">
            No candidates yet. Enable the screener in Settings and it will run
            tonight.
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="ui-card p-6">
                <div className="flex items-center gap-1 text-sm uppercase tracking-wide text-neutral-500 dark:text-[#a8b2bf]">
                  Awaiting research
                  <Tooltip text="Candidates the screener has found but that still need technical fields filled in (RS line, base pattern, entry zone, etc.) before they can be evaluated." />
                </div>
                <div className="mt-2 text-4xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  {awaitingResearchCount}
                </div>
              </div>

              <div className="ui-card p-6">
                <div className="flex items-center gap-1 text-sm uppercase tracking-wide text-neutral-500 dark:text-[#a8b2bf]">
                  Ready for evaluation
                  <Tooltip text="Candidates that have been fully researched and are ready for the rule-based evaluation engine to score." />
                </div>
                <div className="mt-2 text-4xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  {readyForEvaluationCount}
                </div>
              </div>

              <div className="ui-card p-6">
                <div className="flex items-center gap-1 text-sm uppercase tracking-wide text-neutral-500 dark:text-[#a8b2bf]">
                  Last screener run
                  <Tooltip text="The most recent time the automated screener ran and searched for new candidates." />
                </div>
                <div className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  {lastRunAt ? new Date(lastRunAt).toLocaleString() : 'No runs yet'}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="ui-section">
                <h2 className="text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  Step 1 — Copy to ChatGPT
                </h2>
                <p className="mt-3 text-neutral-600 dark:text-[#a8b2bf]">
                  Click copy. Open ChatGPT. Paste. The prompt and candidate data
                  are included.
                </p>
                <div className="mt-5 text-lg font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  {candidates.length} candidates included
                </div>

                <textarea
                  readOnly
                  value={clipboardPreview}
                  className="ui-textarea mt-5 h-32 overflow-hidden font-mono text-xs text-neutral-500 dark:text-[#a8b2bf]"
                />

                <button
                  type="button"
                  onClick={handleCopy}
                  className="ui-btn-primary mt-5"
                >
                  {copySuccess ? 'Copied!' : 'Copy prompt + data'}
                </button>
              </div>

              <div className="ui-section">
                <h2 className="text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  Step 2 — Paste ChatGPT output
                </h2>
                <p className="mt-3 text-neutral-600 dark:text-[#a8b2bf]">
                  Paste the JSON that ChatGPT returned. Click Apply to update all
                  candidates at once.
                </p>

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste ChatGPT's JSON output here..."
                  className="ui-textarea mt-5 h-48"
                />

                <div className="mt-4 min-h-7">
                  {importValidation === 'valid' && parsedImport && (
                    <span className="ui-pill-success">
                      Valid JSON — {parsedImport.length} candidates ready to apply
                    </span>
                  )}
                  {importValidation === 'invalid' && (
                    <span className="ui-pill-danger">
                      Invalid JSON — check the output and try again
                    </span>
                  )}
                  {importValidation === 'schema' && (
                    <span className="ui-pill-warning">
                      JSON structure does not match expected format
                    </span>
                  )}
                </div>

                {importSuccess && (
                  <div className="mt-4 text-sm font-medium text-green-700 dark:text-[#8fd0ab]">
                    {importSuccess}
                  </div>
                )}

                {importError && (
                  <div className="mt-4 text-sm font-medium text-red-700 dark:text-[#f0a3a3]">
                    {importError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={importValidation !== 'valid' || importing}
                  className="ui-btn-primary mt-5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing ? 'Applying...' : 'Apply update'}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

function isCandidateReadyForApply(
  row: unknown
): row is Record<string, unknown> {
  if (!isValidImportedRow(row)) return false
  const r = row as Record<string, unknown>

  if (typeof r.ticker !== 'string' || !r.ticker.trim()) return false
  if (typeof r.id !== 'string' || !r.id.trim()) return false

  const booleanFields = [
    'trend_template_pass',
    'rs_line_confirmed',
    'base_pattern_valid',
    'entry_near_pivot',
    'volume_dry_up_pass',
    'volume_breakout_confirmed',
    'earnings_within_2_weeks',
    'binary_event_risk',
  ]

  for (const field of booleanFields) {
    if (r[field] !== null && typeof r[field] !== 'boolean') return false
  }

  const numericFields = [
    'eps_growth_pct',
    'revenue_growth_pct',
    'industry_group_rank',
    'entry_zone_low',
    'entry_zone_high',
    'stop_price',
    'target_1_price',
    'target_2_price',
  ]

  for (const field of numericFields) {
    if (r[field] !== null && typeof r[field] !== 'number') return false
  }

  const validGrades = ['A+', 'A', 'B', 'C', 'F', null]
  if (!validGrades.includes(r.setup_grade as string | null)) return false

  const validAccDist = ['A', 'B', 'C', 'D', 'E', null]
  if (!validAccDist.includes(r.acc_dist_rating as string | null)) return false

  return true
}