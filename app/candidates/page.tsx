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
      rs_line_state: c.rs_line_state,
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
      watchlist_group: c.watchlist_group,
      ibd_group: c.ibd_group,
      ibd_group_zone: c.ibd_group_zone,
      catalyst_type: c.catalyst_type,
      institutional_trend: c.institutional_trend,
      insider_buying: c.insider_buying,
      short_interest_trend: c.short_interest_trend,
      base_count: c.base_count,
      likely_failure_type: c.likely_failure_type,
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
- For each candidate, when assigning setup_grade, briefly state in failure_response which SEPA® source principle supports the grade (e.g. "Minervini Trend Template — Trade Like a Stock Market Wizard Ch.7" or "VCP pattern — O'Neil CAN SLIM base-building principle"). Keep it to one phrase.

CANDIDATE QUALITY RULES:
- Before researching any candidate, assess whether it is a real operating business with a tradeable chart.
- If a candidate is a SPAC, shell company, blank check company, acquisition vehicle, ADR with no US listing, ETF, warrant, or any non-operating entity — set setup_grade to "F" and leave all price fields (pivot_price, entry_zone_low, entry_zone_high, stop_price, target_1_price, target_2_price) as null. Set all boolean fields to false.
- If a candidate has eps_growth_pct of 0 or null AND revenue_growth_pct of 0 or null — set setup_grade to "F".
- Only populate pivot_price, entry_zone_low, entry_zone_high, stop_price, and target_1_price if BOTH trend_template_pass is true AND base_pattern_valid is true. If either is false or null, leave all price fields as null.
- A setup_grade of "F" means the candidate will be automatically rejected and not imported into the system.

FIELD DEFINITIONS — fill these in for each candidate:

setup_grade (string: "A+", "A", "B", "C", or "F")
  Assign using these exact criteria:
  A+ = ALL of the following: all 8 Trend Template criteria passing, 3-4 contraction VCP with clear volume dry-up at pivot, RS line making new all-time highs before or at the breakout, EPS Rating 90+, A/D Rating A or B, industry group rank 1-20 (top 10%), clear fundamental catalyst, R/R 3:1 or better to target_1_price.
  A  = ALL of: all 8 Trend Template passing, 2-3 contraction VCP, RS line trending up (not necessarily new highs), EPS Rating 80-89, A/D Rating A or B, industry group rank 1-40 (top 20%), catalyst present, R/R 2:1 or better.
  B  = ONE OR MORE of: 7 of 8 Trend Template passing, VCP has only 2 contractions or borderline volume, RS line flat, A/D Rating C, group rank 41-60, R/R only 2:1.
  C  = multiple conditions failing — marginal setup, trial size only.
  F  = unresearchable or disqualified. See quality rules above.

liquidity_pass (boolean)
  True if average daily volume is above 500,000 shares AND price is above $10 AND market cap is above $500M. False otherwise.

trend_template_pass (boolean)
  True only if ALL 8 criteria are met simultaneously:
  1. Price above 50-day MA
  2. Price above 150-day MA
  3. Price above 200-day MA
  4. 50-day MA above 150-day MA
  5. 150-day MA above 200-day MA
  6. 200-day MA trending up for at least 1 month
  7. Price within 25% of 52-week high
  8. Price at least 25% above 52-week low
  False if any single criterion fails.

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

entry_zone_low (number)
  Lower bound of the valid entry zone — the pivot price itself or up to 1% above it. This is the buy-stop trigger price. Round to 2 decimal places.

entry_zone_high (number)
  Upper bound of the valid entry zone — maximum 5% above entry_zone_low. Any fill above this is extended and should not be chased. Round to 2 decimal places.

stop_price (number)
  Place just below the lowest point of the final VCP contraction (the tightest part of the base). For a power play setup, 3-4% below entry. Must be specific to chart structure — not a fixed percentage. Must be below entry_zone_low. Round to 2 decimal places.

target_1_price (number)
  First profit target at 10-15% above entry_zone_low. Must produce a reward-to-risk ratio of at least 2:1 relative to entry_zone_low and stop_price. Round to 2 decimal places.

target_2_price (number or null)
  Second profit target at 20-25% above entry_zone_low. Null if no meaningful second target exists. Round to 2 decimal places.

watchlist_group (string: "active_setup", "near_pivot", or "developing", or null)
  Classify this candidate into one of three groups based on setup readiness:
  "active_setup" = setup is fully formed, at or very close to pivot, ready for a buy signal. Price within 2% of pivot. All Trend Template criteria passing. Base pattern valid. RS line confirmed.
  "near_pivot" = setup is building toward a pivot. Price 2–10% below pivot. Trend Template passing. Base pattern forming but not yet tight enough for entry.
  "developing" = early-stage candidate. Trend Template passing. No clear base yet or price more than 10% below any pivot. Worth monitoring but not actionable.
  null = cannot be classified — missing data or setup is invalid.

ibd_group (string or null)
  The IBD Industry Group name this stock belongs to. Use the exact IBD group name where possible (e.g. "Medical-Biomed/Biotech", "Computer Software-Enterprise", "Semiconductor-Equipment"). If the IBD group name is not available, use the closest GICS industry group name. Return null if you cannot determine the group with confidence.

ibd_group_zone (integer: 1, 2, 3, or 4, or null)
  The zone classification based on IBD's current industry group ranking out of ~197 groups:
  1 = ranks 1–40 (top 20%) — SEPA® eligible, strongest sector momentum
  2 = ranks 41–80 — acceptable but not ideal
  3 = ranks 81–120 — avoid for new entries
  4 = ranks 121–197 — hard avoid, institutional headwind
  Use the industry_group_rank field already assigned to determine the zone:
  - If industry_group_rank is 1–40: return 1
  - If industry_group_rank is 41–80: return 2
  - If industry_group_rank is 81–120: return 3
  - If industry_group_rank is 121–197: return 4
  - If industry_group_rank is null: return null

catalyst_type (string or null)
  The primary fundamental catalyst driving this stock's earnings and revenue growth. Select the single best match from these 9 types:
  "earnings_acceleration" = EPS growth accelerating over 3+ consecutive quarters — the strongest SEPA® catalyst. Size at full grade risk %.
  "revenue_acceleration" = Revenue growth accelerating quarter-over-quarter, even if EPS is not yet fully reflecting it. Full size.
  "new_product_service" = A new product, platform, or service that is materially changing the revenue trajectory. Full size if in early adoption phase.
  "regulatory_approval" = FDA approval, government contract award, or similar approval event that has already occurred (not pending — binary events are captured in binary_event_risk). Full size post-approval.
  "spinoff_restructuring" = Recent spin-off, merger completion, or major restructuring that has reset the growth profile. Size at 50-75% until first earnings post-event.
  "management_change" = New CEO/CFO with a credible turnaround or growth mandate. Size at 50% until first earnings under new management confirms the thesis.
  "sector_rotation" = No specific company catalyst — stock is rising on broad sector or macro tailwinds. Size at 50% — sector rotation setups have shorter duration.
  "macro_theme" = Direct beneficiary of a multi-year macro trend (AI infrastructure, GLP-1, defence spending, reshoring). Full size if earnings are already accelerating.
  "none_identified" = No clear fundamental catalyst identified. This should lower the setup grade — a technically valid setup without a catalyst is a B or C at best.
  Return null only if you cannot research the company.

institutional_trend (string: "accumulating", "neutral", or "distributing", or null)
  The net direction of institutional ownership over the past 2 quarters based on 13F filings and fund flow data:
  "accumulating" = Net new institutional buyers in the last 1-2 quarters. Number of funds holding is increasing. This is a positive confirmation signal.
  "neutral" = Institutional ownership stable — neither meaningfully increasing nor decreasing.
  "distributing" = Net institutional selling. Number of funds holding is decreasing. This is a warning signal even if price is holding.
  Use SEC EDGAR 13F data, WhaleWisdom, or similar. Return null if data is unavailable.

insider_buying (boolean or null)
  True if company insiders (CEO, CFO, board members) have made open-market purchases of shares in the past 90 days — not option exercises, not automatic 10b5-1 plan purchases. Open-market buys signal conviction. False if no insider buying or if insiders are net sellers. Use SEC Form 4 data. Return null if data is unavailable.

short_interest_trend (string: "increasing", "stable", or "decreasing", or null)
  The direction of short interest as a % of float over the past 30-60 days:
  "increasing" = Short interest rising — bears are pressing. This adds fuel to a potential short squeeze if the breakout occurs on volume.
  "stable" = Short interest flat.
  "decreasing" = Short interest declining — bears are covering. This can indicate that the stock's thesis is strengthening.
  Note: High short interest + strong institutional accumulation + valid base pattern = ideal setup for a violent short squeeze breakout.

base_count (integer: 1, 2, 3, or 4, or null)
  Which base in the current price advance is this setup forming?
  1 = First base after a significant move off lows or breakout from a long consolidation. Highest potential — institutions are still early in their accumulation.
  2 = Second base. Still acceptable. Trend is established, risk is that it is becoming more crowded.
  3 = Third base. Proceed with caution — late-stage advances are more prone to failure. Reduce to 50% of standard size.
  4 = Fourth base or later. Hard avoid — this is a Stage 3 top candidate. Set setup_grade to "C" at best regardless of technical quality.
  Count only valid SEPA® bases (VCP, flat base, cup-with-handle, ascending base) — do not count minor consolidations. Return null if you cannot determine with confidence.
  IMPORTANT: If base_count is 3 or 4, explicitly note this in your grade rationale and apply the late-stage caution rules above.

likely_failure_type (string or null)
  Based on the current market environment and this specific setup, which of these 5 failure types is most likely if this trade fails? Select one:
  "institutional_reversal" = Day 1 reversal on high volume — large institutions reject the breakout immediately. Most likely when: volume at breakout is high but price closes in the lower half of the range, or when the broader market is under distribution. Response: exit same day if price closes below pivot on volume.
  "fade" = Day 3–7 slow fade — price drifts back toward the pivot over several days without a sharp reversal. Most likely when: the base is 2nd or 3rd (later stage), sector momentum is weakening, or breakout volume was only marginally above average. Response: use Day 7 rule — if no progress after 7 days, exit at breakeven.
  "gap_down" = Overnight gap-down on news — sudden adverse catalyst. Most likely when: earnings are within 30 days, binary_event_risk is true, or the stock has a history of volatile news reactions. Response: exit at market open regardless of gap size.
  "limbo" = Extended limbo — price hovers just above pivot without advancing for 10+ days. Most likely when: market phase is under_pressure, volume has dried up post-breakout, or sector has stalled. Response: exit after Day 11 if price has not advanced at least 5% from pivot.
  "sector_rotation" = Sector rotation stop-out — the stock's sector loses leadership while individual stock fundamentals remain intact. Most likely when: ibd_group_zone is 2 or 3, the stock is in a cyclical sector, or macro environment is shifting. Response: keep stock on watchlist after exit — may re-enter if sector leadership returns.
  Return null if you cannot assess the likely failure type with confidence.

failure_response (string or null)
  One sentence describing the exact response if the likely_failure_type occurs — what to do, when to do it, and what to watch for. This should be specific enough to act on without consulting any other document. Example: "Exit same day if price closes below $142.50 on volume above 800K — do not wait for the next morning." Return null if likely_failure_type is null.

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
          rs_line_state,
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

  const validWatchlistGroups = ['active_setup', 'near_pivot', 'developing', null]
  if (!validWatchlistGroups.includes(r.watchlist_group as string | null)) return false

  if (r.ibd_group !== null && typeof r.ibd_group !== 'string') return false
  const validZones = [1, 2, 3, 4, null]
  if (!validZones.includes(r.ibd_group_zone as number | null)) return false
  if (!isValidRsLineStateApply(r.rs_line_state)) return false
  if (!isValidCatalystTypeApply(r.catalyst_type)) return false
  if (!isValidInstitutionalTrendApply(r.institutional_trend)) return false
  if (r.insider_buying !== null && typeof r.insider_buying !== 'boolean') return false
  if (!isValidShortInterestTrendApply(r.short_interest_trend)) return false
  if (r.base_count !== null && (typeof r.base_count !== 'number' || r.base_count < 1 || r.base_count > 4)) return false
  if (!isValidLikelyFailureTypeApply(r.likely_failure_type)) return false
  if (r.failure_response !== null && typeof r.failure_response !== 'string') return false

  return true
}