'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/app/trading/lib/supabase'
import { AppHeader } from '@/app/trading/components/AppHeader'
import { Tooltip } from '@/components/ui/Tooltip'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'

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
  rs_line_state: 'leading' | 'confirmed' | 'warning' | null
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
  watchlist_group: 'active_setup' | 'near_pivot' | 'developing' | null
  ibd_group: string | null
  ibd_group_zone: 1 | 2 | 3 | 4 | null
  catalyst_type:
    | 'earnings_acceleration'
    | 'revenue_acceleration'
    | 'new_product_service'
    | 'management_change'
    | 'regulatory_approval'
    | 'spinoff_restructuring'
    | 'sector_rotation'
    | 'macro_theme'
    | 'none_identified'
    | null
  institutional_trend: 'accumulating' | 'neutral' | 'distributing' | null
  insider_buying: boolean | null
  short_interest_trend: 'increasing' | 'stable' | 'decreasing' | null
  base_count: number | null
  likely_failure_type:
    | 'institutional_reversal'
    | 'fade'
    | 'gap_down'
    | 'limbo'
    | 'sector_rotation'
    | null
  failure_response: string | null
  pivot_price: number | null
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
      rs_line_confirmed: c.rs_line_confirmed,
      rs_line_state: c.rs_line_state,
      base_pattern_valid: c.base_pattern_valid,
      entry_near_pivot: c.entry_near_pivot,
      volume_dry_up_pass: c.volume_dry_up_pass,
      volume_breakout_confirmed: c.volume_breakout_confirmed,
      earnings_within_2_weeks: c.earnings_within_2_weeks,
      binary_event_risk: c.binary_event_risk,
      acc_dist_rating: c.acc_dist_rating,
      industry_group_rank: c.industry_group_rank,
      pivot_price: c.pivot_price,
      stop_price: c.stop_price,
      ibd_group: c.ibd_group,
      catalyst_type: c.catalyst_type,
      institutional_trend: c.institutional_trend,
      insider_buying: c.insider_buying,
      short_interest_trend: c.short_interest_trend,
      base_count: c.base_count,
      failure_response: c.failure_response,
    })),
    null,
    2
  )

  const prompt = `You are a professional swing trading research analyst specialising in Mark Minervini's SEPA® methodology. I will give you a JSON array of stock candidates that my automated screener has identified. The screener has already verified price above $10, 50-day average volume above 500,000, EPS growth above 25%, revenue growth above 25%, and all 8 Trend Template criteria. Your job is to research each stock using current market data and fill in the remaining null fields required for a full SEPA® rule evaluation.

STRICT OUTPUT RULES:
- Return ONLY a valid JSON array. Not an object — a JSON array starting with [ and ending with ]. No markdown, no explanation, no backticks, no preamble, no trailing text.
- Do not change any field that already contains a non-null value.
- Do not add, rename, or remove any fields.
- Preserve every "id" field exactly as provided — these are database primary keys.
- If you cannot determine a value with reasonable confidence, return null. Do not guess.

CANDIDATE QUALITY RULES:
- Before researching any candidate, assess whether it is a real operating business with a tradeable chart.
- If a candidate is a SPAC, shell company, blank check company, acquisition vehicle, ADR with no US listing, ETF, warrant, or any non-operating entity — set setup_grade to "F" and leave all price fields (pivot_price, stop_price) as null. Set all boolean fields to false.
- If a candidate has eps_growth_pct of 0 or null AND revenue_growth_pct of 0 or null — set setup_grade to "F".
- Only populate pivot_price and stop_price if BOTH trend_template_pass is true AND base_pattern_valid is true. If either is false or null, leave both price fields as null.
- A setup_grade of "F" means the candidate will be automatically rejected and not imported into the system.

FIELD DEFINITIONS — fill these in for each candidate:

setup_grade (string: "A+", "A", "B", "C", or "F")
  Assign using these exact criteria:
  A+ = ALL of the following: all 8 Trend Template criteria passing, 3-4 contraction VCP with clear volume dry-up at pivot, RS line making new all-time highs before or at the breakout, EPS Rating 90+, A/D Rating A or B, industry group rank 1-20 (top 10%), clear fundamental catalyst, R/R 3:1 or better.
  A  = ALL of: all 8 Trend Template passing, 2-3 contraction VCP, RS line trending up (not necessarily new highs), EPS Rating 80-89, A/D Rating A or B, industry group rank 1-40 (top 20%), catalyst present, R/R 2:1 or better.
  B  = ONE OR MORE of: 7 of 8 Trend Template passing, VCP has only 2 contractions or borderline volume, RS line flat, A/D Rating C, group rank 41-60, R/R only 2:1.
  C  = multiple conditions failing — marginal setup, trial size only.
  F  = unresearchable or disqualified. See quality rules above.

rs_line_confirmed (boolean)
  Derived from rs_line_state. Set to true if rs_line_state is "leading" or "confirmed". Set to false if rs_line_state is "warning". Set to null if rs_line_state is null. Always populate rs_line_state first, then set this field accordingly.

rs_line_state (string: "leading", "confirmed", or "warning", or null)
  The 3-state RS line signal — the single most important non-earnings signal in SEPA®:
  "leading"   = The RS line made a new 52-week high BEFORE the price breakout. This is the A+ signal — institutional money rotating in ahead of the move.
  "confirmed" = The RS line is trending upward and rising during the base formation, but has not yet made new highs. A solid A signal.
  "warning"   = The RS line is flat, declining, or lagging price. This is a warning — even if the price pattern looks valid, weak RS line = weak institutional sponsorship.
  null = Cannot be determined with confidence.
  Populate this field before rs_line_confirmed. The boolean is derived from this field.

base_pattern_valid (boolean)
  True if forming or recently completed a valid SEPA® base: VCP (2-4 contractions each smaller), flat base (under 15% depth, 5+ weeks), cup-with-handle, or ascending base. Base must be at least 3 weeks long. False if the stock is extended more than 5% above the pivot, in a Stage 3 top, or has no identifiable base.

entry_near_pivot (boolean)
  True if current price is within 5% above the pivot point. False if extended more than 5% above pivot or not yet at pivot.

volume_dry_up_pass (boolean)
  True if volume has contracted to multi-week or multi-month lows in the tightest part of the base near the pivot — confirming supply exhaustion. False if volume is elevated or erratic throughout the base.

volume_breakout_confirmed (boolean)
  True only if the stock has already broken above the pivot on volume at least 40-50% above its 50-day average. False if no breakout has occurred yet or the breakout volume was below-average.

earnings_within_2_weeks (boolean)
  True if the next earnings report is within 14 calendar days from today's date. False otherwise. Check the earnings calendar carefully.

binary_event_risk (boolean)
  True if a pending FDA decision, major regulatory ruling, merger vote, or similar binary event could cause a gap of 15%+ within 30 days. False otherwise.

acc_dist_rating (string: "A", "B", "C", "D", or "E")
  IBD Accumulation/Distribution Rating. A and B = institutional accumulation. D and E = distribution. Use the IBD rating if available. If not, approximate from price/volume behaviour over the past 13 weeks — more up days on heavy volume than down days = A or B; more down days on heavy volume = D or E.

industry_group_rank (integer: 1 to 197)
  IBD Industry Group rank out of ~197 groups. Rank 1 is strongest. Top 40 = top 20% = acceptable for SEPA®. Return the integer only.

pivot_price (number)
  The exact resistance price level the stock must break above to confirm the setup — the high of the most recent base or handle. Single price, not a zone. Round to 2 decimal places.

stop_price (number)
  Place just below the lowest point of the final VCP contraction (the tightest part of the base). For a power play setup, 3-4% below entry. Must be specific to chart structure — not a fixed percentage. Must be below pivot_price. Round to 2 decimal places.

ibd_group (string or null)
  The IBD Industry Group name this stock belongs to. Use the exact IBD group name where possible (e.g. "Medical-Biomed/Biotech", "Computer Software-Enterprise", "Semiconductor-Equipment"). If the IBD group name is not available, use the closest GICS industry group name. Return null if you cannot determine the group with confidence.

catalyst_type (string or null)
  The primary fundamental catalyst driving this stock's earnings and revenue growth. Select the single best match from these 9 types:
  "earnings_acceleration" = EPS growth accelerating over 3+ consecutive quarters — the strongest SEPA® catalyst.
  "revenue_acceleration" = Revenue growth accelerating quarter-over-quarter, even if EPS is not yet fully reflecting it.
  "new_product_service" = A new product, platform, or service that is materially changing the revenue trajectory.
  "regulatory_approval" = FDA approval, government contract award, or similar approval event that has already occurred (not pending).
  "spinoff_restructuring" = Recent spin-off, merger completion, or major restructuring that has reset the growth profile.
  "management_change" = New CEO/CFO with a credible turnaround or growth mandate.
  "sector_rotation" = No specific company catalyst — stock is rising on broad sector or macro tailwinds.
  "macro_theme" = Direct beneficiary of a multi-year macro trend (AI infrastructure, GLP-1, defence spending, reshoring).
  "none_identified" = No clear fundamental catalyst identified. This should lower the setup grade — a technically valid setup without a catalyst is a B or C at best.
  Return null only if you cannot research the company.

institutional_trend (string: "accumulating", "neutral", or "distributing", or null)
  The net direction of institutional ownership over the past 2 quarters based on 13F filings and fund flow data:
  "accumulating" = Net new institutional buyers in the last 1-2 quarters. Number of funds holding is increasing.
  "neutral" = Institutional ownership stable.
  "distributing" = Net institutional selling. Number of funds holding is decreasing.
  Use SEC EDGAR 13F data, WhaleWisdom, or similar. Return null if data is unavailable.

insider_buying (boolean or null)
  True if company insiders (CEO, CFO, board members) have made open-market purchases of shares in the past 90 days — not option exercises, not automatic 10b5-1 plan purchases. False if no insider buying or if insiders are net sellers. Use SEC Form 4 data. Return null if data is unavailable.

short_interest_trend (string: "increasing", "stable", or "decreasing", or null)
  The direction of short interest as a % of float over the past 30-60 days.
  "increasing" = Short interest rising.
  "stable" = Short interest flat.
  "decreasing" = Short interest declining — bears are covering.

base_count (integer: 1, 2, 3, or 4, or null)
  Which base in the current price advance is this setup forming?
  1 = First base after a significant move off lows. Highest potential.
  2 = Second base. Still acceptable.
  3 = Third base. Proceed with caution — reduce to 50% of standard size.
  4 = Fourth base or later. Hard avoid — set setup_grade to "C" at best.
  Count only valid SEPA® bases (VCP, flat base, cup-with-handle, ascending base). Return null if you cannot determine with confidence.

failure_response (string or null)
  One sentence describing what to watch for and how to respond if this trade fails. Be specific to this stock's setup — mention the pivot price level, volume threshold, or time rule that would trigger an exit. Example: "Exit same day if price closes below the pivot on volume above the 50-day average — do not wait for the next morning." Return null if you cannot assess with confidence.

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
              rs_line_state,
              base_pattern_valid,
              entry_near_pivot,
              volume_dry_up_pass,
              volume_breakout_confirmed,
              earnings_within_2_weeks,
              binary_event_risk,
              acc_dist_rating,
              industry_group_rank,
              pivot_price,
              entry_zone_low,
              entry_zone_high,
              stop_price,
              target_1_price,
              target_2_price,
              watchlist_group,
              ibd_group,
              ibd_group_zone,
              catalyst_type,
              institutional_trend,
              insider_buying,
              short_interest_trend,
              base_count,
              likely_failure_type,
              failure_response
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
      const response = await fetch('/trading/api/watchlist/bulk-update', {
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
      if (typed.rejected > 0) {
        msg.push(`${typed.rejected} F-grade candidates removed`)
      }
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
          rs_line_state,
          base_pattern_valid,
          entry_near_pivot,
          volume_dry_up_pass,
          volume_breakout_confirmed,
          earnings_within_2_weeks,
          binary_event_risk,
          acc_dist_rating,
          industry_group_rank,
          pivot_price,
          entry_zone_low,
          entry_zone_high,
          stop_price,
          target_1_price,
          target_2_price,
          watchlist_group,
          ibd_group,
          ibd_group_zone,
          catalyst_type,
          institutional_trend,
          insider_buying,
          short_interest_trend,
          base_count,
          likely_failure_type,
          failure_response
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
          <div className="mt-6 text-sm text-neutral-600 dark:text-[#a8b2bf]">
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
          <div className="ui-section mt-6 text-neutral-700 dark:text-[#a8b2bf]">
            No candidates yet. Enable the screener in Settings and it will run
            tonight.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="ui-card p-6">
                <div className="flex items-center gap-1 text-sm uppercase tracking-wide text-neutral-500 dark:text-[#a8b2bf]">
                  Awaiting research
                  <Tooltip text="Candidates the screener has found but still need technical fields filled in before evaluation." />
                </div>
                <div className="mt-2 text-4xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  {awaitingResearchCount}
                </div>
              </div>

              <div className="ui-card p-6">
                <div className="flex items-center gap-1 text-sm uppercase tracking-wide text-neutral-500 dark:text-[#a8b2bf]">
                  Ready for evaluation
                  <Tooltip text="Candidates that are fully researched and ready for the rule engine." />
                </div>
                <div className="mt-2 text-4xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  {readyForEvaluationCount}
                </div>
              </div>

              <div className="ui-card p-6 sm:col-span-2 xl:col-span-1">
                <div className="flex items-center gap-1 text-sm uppercase tracking-wide text-neutral-500 dark:text-[#a8b2bf]">
                  Last screener run
                  <Tooltip text="The most recent time the automated screener ran." />
                </div>
                <div className="mt-2 text-xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  {lastRunAt ? new Date(lastRunAt).toLocaleString() : 'No runs yet'}
                </div>
              </div>
            </div>

            <CollapsibleSection
              title="Step 1 — Copy to ChatGPT"
              subtitle="Copy the full prompt and candidate data for research."
              defaultOpen={true}
            >
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-[#a8b2bf]">
                  Click copy. Open ChatGPT. Paste. The prompt and candidate data
                  are included.
                </p>

                <div className="text-lg font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  {candidates.length} candidates included
                </div>

                <textarea
                  readOnly
                  value={clipboardPreview}
                  className="ui-textarea h-32 overflow-hidden font-mono text-xs text-neutral-500 dark:text-[#a8b2bf]"
                />

                <button
                  type="button"
                  onClick={handleCopy}
                  className="ui-btn-primary"
                >
                  {copySuccess ? 'Copied!' : 'Copy prompt + data'}
                </button>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Step 2 — Paste ChatGPT output"
              subtitle="Paste the JSON output and apply all candidate updates at once."
              defaultOpen={true}
            >
              <div className="space-y-4">
                <p className="text-neutral-600 dark:text-[#a8b2bf]">
                  Paste the JSON that ChatGPT returned. Click Apply to update all
                  candidates at once.
                </p>

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste ChatGPT's JSON output here..."
                  className="ui-textarea h-48"
                />

                <div className="min-h-7">
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
                  <div className="text-sm font-medium text-green-700 dark:text-[#8fd0ab]">
                    {importSuccess}
                  </div>
                )}

                {importError && (
                  <div className="text-sm font-medium text-red-700 dark:text-[#f0a3a3]">
                    {importError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={importValidation !== 'valid' || importing}
                  className="ui-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing ? 'Applying...' : 'Apply update'}
                </button>
              </div>
            </CollapsibleSection>
          </div>
        )}
      </section>
    </main>
  )
}

function isValidRsLineStateApply(value: unknown): boolean {
  return value === null || ['leading', 'confirmed', 'warning'].includes(String(value))
}

function isValidCatalystTypeApply(value: unknown): boolean {
  return value === null || [
    'earnings_acceleration', 'revenue_acceleration', 'new_product_service',
    'management_change', 'regulatory_approval', 'spinoff_restructuring',
    'sector_rotation', 'macro_theme', 'none_identified'
  ].includes(String(value))
}

function isValidInstitutionalTrendApply(value: unknown): boolean {
  return value === null || ['accumulating', 'neutral', 'distributing'].includes(String(value))
}

function isValidShortInterestTrendApply(value: unknown): boolean {
  return value === null || ['increasing', 'stable', 'decreasing'].includes(String(value))
}

function isValidLikelyFailureTypeApply(value: unknown): boolean {
  return value === null || [
    'institutional_reversal', 'fade', 'gap_down', 'limbo', 'sector_rotation'
  ].includes(String(value))
}

function isCandidateReadyForApply(
  row: unknown
): row is Record<string, unknown> {
  if (!isValidImportedRow(row)) return false
  const r = row as Record<string, unknown>

  if (typeof r.ticker !== 'string' || !r.ticker.trim()) return false
  if (typeof r.id !== 'string' || !r.id.trim()) return false

  const booleanFields = [
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
    'pivot_price',
    'stop_price',
  ]

  for (const field of numericFields) {
    if (r[field] !== null && typeof r[field] !== 'number') return false
  }

  const validGrades = ['A+', 'A', 'B', 'C', 'F', null]
  if (!validGrades.includes(r.setup_grade as string | null)) return false

  const validAccDist = ['A', 'B', 'C', 'D', 'E', null]
  if (!validAccDist.includes(r.acc_dist_rating as string | null)) return false

  if (r.ibd_group !== null && typeof r.ibd_group !== 'string') return false
  if (!isValidRsLineStateApply(r.rs_line_state)) return false
  if (!isValidCatalystTypeApply(r.catalyst_type)) return false
  if (!isValidInstitutionalTrendApply(r.institutional_trend)) return false
  if (r.insider_buying !== null && typeof r.insider_buying !== 'boolean') return false
  if (!isValidShortInterestTrendApply(r.short_interest_trend)) return false
  if (
    r.base_count !== null &&
    (typeof r.base_count !== 'number' || r.base_count < 1 || r.base_count > 4)
  ) {
    return false
  }
  if (!isValidLikelyFailureTypeApply(r.likely_failure_type)) return false
  if (r.failure_response !== null && typeof r.failure_response !== 'string') return false

  return true
}