import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type {
  DecisionJournalEntry,
  Holding,
  StockAnalysis,
  WatchlistItem,
} from '@/app/investing/types'
import { TickerActionBar } from '@/components/investing/TickerActionBar'
import { InvestingPageHeader } from '@/components/investing/InvestingPageHeader'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'

type Props = {
  params: Promise<{
    ticker: string
  }>
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCurrencyRounded(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(1)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getVerdictTone(verdict: StockAnalysis['verdict'] | null | undefined) {
  switch (verdict) {
    case 'Strong Buy':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'Buy':
      return 'text-blue-600 dark:text-blue-400'
    case 'Hold':
      return 'text-amber-600 dark:text-amber-400'
    case 'Avoid':
      return 'text-red-600 dark:text-red-400'
    case 'Red Flag':
      return 'text-red-700 dark:text-red-300'
    default:
      return 'text-neutral-500 dark:text-[#a8b2bf]'
  }
}

function getActionTone(action: DecisionJournalEntry['action']) {
  switch (action) {
    case 'BUY':
    case 'ADD':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'SELL':
    case 'TRIM':
      return 'text-red-600 dark:text-red-400'
    case 'HOLD':
      return 'text-blue-600 dark:text-blue-400'
    default:
      return 'text-neutral-500 dark:text-[#a8b2bf]'
  }
}

function buildQuery(params: Record<string, string | number | null | undefined>) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue
    const text = String(value).trim()
    if (!text) continue
    searchParams.set(key, text)
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

function getValuationStatus(args: {
  currentPrice: number | null | undefined
  fairValueLow: number | null | undefined
  fairValueHigh: number | null | undefined
}): 'Below fair value' | 'Within range' | 'Above fair value' | null {
  const { currentPrice, fairValueLow, fairValueHigh } = args

  if (
    currentPrice == null ||
    !Number.isFinite(currentPrice) ||
    fairValueLow == null ||
    !Number.isFinite(fairValueLow) ||
    fairValueHigh == null ||
    !Number.isFinite(fairValueHigh)
  ) {
    return null
  }

  if (currentPrice < fairValueLow) return 'Below fair value'
  if (currentPrice > fairValueHigh) return 'Above fair value'
  return 'Within range'
}

function getWatchlistActionHint(args: {
  latestVerdict: StockAnalysis['verdict'] | null | undefined
  latestConfidence: StockAnalysis['confidence'] | string | null | undefined
  currentPrice: number | null | undefined
  fairValueLow: number | null | undefined
  fairValueHigh: number | null | undefined
}): 'Ready to buy' | 'Keep watching' | 'Too extended' | 'Needs new analysis' | null {
  const { latestVerdict, latestConfidence, currentPrice, fairValueLow, fairValueHigh } = args

  if (!latestVerdict) return 'Needs new analysis'

  if (
    currentPrice == null ||
    !Number.isFinite(currentPrice) ||
    fairValueLow == null ||
    !Number.isFinite(fairValueLow) ||
    fairValueHigh == null ||
    !Number.isFinite(fairValueHigh)
  ) {
    return latestVerdict === 'Strong Buy' || latestVerdict === 'Buy'
      ? 'Keep watching'
      : 'Needs new analysis'
  }

  if ((latestVerdict === 'Strong Buy' || latestVerdict === 'Buy') && currentPrice <= fairValueHigh) {
    return 'Ready to buy'
  }

  if (currentPrice > fairValueHigh) {
    return 'Too extended'
  }

  if (latestConfidence === 'Low') {
    return 'Needs new analysis'
  }

  return 'Keep watching'
}

function getPortfolioActionHint(args: {
  latestVerdict: StockAnalysis['verdict'] | null | undefined
  latestConfidence: StockAnalysis['confidence'] | string | null | undefined
  valuationStatus: 'Below fair value' | 'Within range' | 'Above fair value' | null | undefined
  thesisStatus: Holding['thesis_status'] | null | undefined
}): 'Add candidate' | 'Hold' | 'Trim candidate' | 'Review thesis' | null {
  const { latestVerdict, latestConfidence, valuationStatus, thesisStatus } = args

  if (thesisStatus === 'Broken' || thesisStatus === 'Weakening') {
    return 'Review thesis'
  }

  if (
    (latestVerdict === 'Strong Buy' || latestVerdict === 'Buy') &&
    valuationStatus === 'Below fair value' &&
    latestConfidence !== 'Low'
  ) {
    return 'Add candidate'
  }

  if (
    valuationStatus === 'Above fair value' &&
    (latestVerdict === 'Hold' || latestVerdict === 'Avoid' || latestVerdict === 'Red Flag')
  ) {
    return 'Trim candidate'
  }

  return 'Hold'
}

function getManualOrAutoSource(args: {
  manualValue: unknown
  autoValue: unknown
}): 'Manual' | 'Auto' | null {
  const { manualValue, autoValue } = args
  if (manualValue != null) return 'Manual'
  if (autoValue != null) return 'Auto'
  return null
}

function getSourceBadgeClass(source: 'Manual' | 'Auto') {
  return source === 'Manual'
    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
}

function SourceBadge({ source }: { source: 'Manual' | 'Auto' | null }) {
  if (!source) return <span className="text-neutral-500 dark:text-[#a8b2bf]">—</span>

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getSourceBadgeClass(source)}`}
    >
      {source}
    </span>
  )
}

export default async function InvestingTickerDetailPage({ params }: Props) {
  const { ticker } = await params
  const normalizedTicker = decodeURIComponent(ticker).trim().toUpperCase()

  if (!normalizedTicker) {
    notFound()
  }

  const supabase = await createSupabaseServerClient()

  const [holdingsRes, watchlistRes, analysesRes, journalRes] = await Promise.all([
    supabase
      .from('investing_holdings')
      .select('*')
      .eq('ticker', normalizedTicker)
      .order('market_value', { ascending: false }),
    supabase
      .from('investing_watchlist')
      .select('*')
      .eq('ticker', normalizedTicker)
      .order('date_added', { ascending: false })
      .limit(1),
    supabase
      .from('investing_stock_analyses')
      .select('*')
      .eq('ticker', normalizedTicker)
      .order('analysis_date', { ascending: false }),
    supabase
      .from('investing_decision_journal')
      .select('*')
      .eq('ticker', normalizedTicker)
      .order('entry_date', { ascending: false })
      .order('entry_number', { ascending: false }),
  ])

  const holdings = (holdingsRes.data ?? []) as Holding[]
  const watchlistItem = ((watchlistRes.data ?? [])[0] ?? null) as WatchlistItem | null
  const analyses = (analysesRes.data ?? []) as StockAnalysis[]
  const journalEntries = (journalRes.data ?? []) as DecisionJournalEntry[]

  if (
    holdings.length === 0 &&
    !watchlistItem &&
    analyses.length === 0 &&
    journalEntries.length === 0
  ) {
    notFound()
  }

  const latestAnalysis = analyses[0] ?? null
  const latestJournal = journalEntries[0] ?? null
  const primaryHolding = holdings[0] ?? null

  const latestAnalysisVerdict =
    latestAnalysis?.verdict ?? latestAnalysis?.verdict_auto ?? null
  const latestAnalysisConfidence =
    latestAnalysis?.confidence ?? latestAnalysis?.confidence_auto ?? null
  const latestVerdictSource = getManualOrAutoSource({
    manualValue: latestAnalysis?.verdict,
    autoValue: latestAnalysis?.verdict_auto,
  })
  const latestConfidenceSource = getManualOrAutoSource({
    manualValue: latestAnalysis?.confidence,
    autoValue: latestAnalysis?.confidence_auto,
  })
  const latestValuationSource = getManualOrAutoSource({
    manualValue: latestAnalysis?.valuation_score,
    autoValue: latestAnalysis?.valuation_score_auto,
  })

  const referenceCurrentPrice =
    primaryHolding?.current_price ?? watchlistItem?.current_price ?? null

  const analysisValuationStatus = getValuationStatus({
    currentPrice: referenceCurrentPrice,
    fairValueLow: latestAnalysis?.fair_value_low ?? null,
    fairValueHigh: latestAnalysis?.fair_value_high ?? null,
  })

  const watchlistActionHint = getWatchlistActionHint({
    latestVerdict: latestAnalysisVerdict,
    latestConfidence: latestAnalysisConfidence,
    currentPrice: watchlistItem?.current_price ?? primaryHolding?.current_price ?? null,
    fairValueLow: latestAnalysis?.fair_value_low ?? watchlistItem?.fair_value_low ?? null,
    fairValueHigh: latestAnalysis?.fair_value_high ?? watchlistItem?.fair_value_high ?? null,
  })

  const portfolioActionHint = primaryHolding
    ? getPortfolioActionHint({
        latestVerdict: latestAnalysisVerdict,
        latestConfidence: latestAnalysisConfidence,
        valuationStatus: getValuationStatus({
          currentPrice: primaryHolding.current_price,
          fairValueLow: latestAnalysis?.fair_value_low ?? null,
          fairValueHigh: latestAnalysis?.fair_value_high ?? null,
        }),
        thesisStatus: primaryHolding.thesis_status,
      })
    : null

  const companyName =
    primaryHolding?.company ??
    watchlistItem?.company ??
    latestAnalysis?.company ??
    normalizedTicker

  const totalMarketValue = holdings.reduce(
    (sum, holding) => sum + Number(holding.market_value ?? 0),
    0
  )

  const weightedGainLoss =
    totalMarketValue > 0
      ? holdings.reduce((sum, holding) => {
          const marketValue = Number(holding.market_value ?? 0)
          const gainLossPct = Number(holding.gain_loss_pct ?? 0)
          return sum + (marketValue / totalMarketValue) * gainLossPct
        }, 0)
      : null

  const holdingAccounts =
    holdings.length > 0
      ? Array.from(new Set(holdings.map((holding) => holding.account))).join(', ')
      : '—'

  const holdingBuckets =
    holdings.length > 0
      ? Array.from(new Set(holdings.map((holding) => holding.bucket))).join(', ')
      : '—'

  const addHoldingHref = `/investing/portfolio${buildQuery({
    mode: 'new',
    ticker: normalizedTicker,
    company: companyName,
    account: primaryHolding?.account ?? latestJournal?.account ?? 'TFSA',
    base_currency: primaryHolding?.base_currency ?? 'USD',
    sector: primaryHolding?.sector ?? watchlistItem?.sector ?? latestAnalysis?.sector ?? '',
    shares: primaryHolding?.shares,
    avg_cost: primaryHolding?.avg_cost,
    current_price: primaryHolding?.current_price ?? watchlistItem?.current_price,
    thesis: primaryHolding?.thesis ?? latestAnalysis?.thesis ?? watchlistItem?.why_watching,
    thesis_breakers: primaryHolding?.thesis_breakers ?? latestAnalysis?.thesis_breakers,
    thesis_status: primaryHolding?.thesis_status ?? 'Intact',
    date_bought: primaryHolding?.date_bought,
    bucket: primaryHolding?.bucket ?? 'Core compounder',
  })}`

  const addWatchlistHref = `/investing/watchlist${buildQuery({
    mode: 'new',
    ticker: normalizedTicker,
    company: companyName,
    sector:
      watchlistItem?.sector ?? primaryHolding?.sector ?? latestAnalysis?.sector ?? 'Technology',
    status: watchlistItem?.status ?? 'Under research',
    why_watching: watchlistItem?.why_watching ?? latestAnalysis?.thesis ?? primaryHolding?.thesis,
    target_entry: watchlistItem?.target_entry ?? latestAnalysis?.fair_value_low,
    current_price: watchlistItem?.current_price ?? primaryHolding?.current_price,
    fair_value_low: watchlistItem?.fair_value_low ?? latestAnalysis?.fair_value_low,
    fair_value_high: watchlistItem?.fair_value_high ?? latestAnalysis?.fair_value_high,
    scorecard_overall: watchlistItem?.scorecard_overall ?? latestAnalysis?.overall_score,
  })}`

  const createAnalysisHref = `/investing/analysis${buildQuery({
    mode: 'new',
    ticker: normalizedTicker,
    company: companyName,
    sector:
      latestAnalysis?.sector ?? watchlistItem?.sector ?? primaryHolding?.sector ?? 'Technology',
    fair_value_low: latestAnalysis?.fair_value_low ?? watchlistItem?.fair_value_low,
    fair_value_high: latestAnalysis?.fair_value_high ?? watchlistItem?.fair_value_high,
    thesis: latestAnalysis?.thesis ?? watchlistItem?.why_watching ?? primaryHolding?.thesis,
    thesis_breakers: latestAnalysis?.thesis_breakers ?? primaryHolding?.thesis_breakers,
    overall_score: latestAnalysis?.overall_score ?? watchlistItem?.scorecard_overall,
    confidence: latestAnalysisConfidence,
    raw_analysis: latestAnalysis?.raw_analysis ?? watchlistItem?.why_watching,
    moat_score: latestAnalysis?.moat_score,
    valuation_score: latestAnalysis?.valuation_score,
    mgmt_score: latestAnalysis?.mgmt_score,
    roic_score: latestAnalysis?.roic_score,
    fin_health_score: latestAnalysis?.fin_health_score,
    biz_understanding_score: latestAnalysis?.biz_understanding_score,
    verdict: latestAnalysisVerdict,
  })}`

  const createJournalHref = `/investing/journal${buildQuery({
    mode: 'new',
    ticker: normalizedTicker,
    account: latestJournal?.account ?? primaryHolding?.account ?? 'TFSA',
    action: latestJournal?.action ?? (primaryHolding ? 'HOLD' : 'BUY'),
    shares: latestJournal?.shares ?? primaryHolding?.shares,
    price: latestJournal?.price ?? primaryHolding?.current_price,
    portfolio_weight_after: latestJournal?.portfolio_weight_after,
    reasoning: latestJournal?.reasoning ?? primaryHolding?.thesis ?? latestAnalysis?.thesis,
    emotional_state: latestJournal?.emotional_state,
    scorecard_overall: latestJournal?.scorecard_overall ?? latestAnalysis?.overall_score,
    framework_supported: latestJournal?.framework_supported,
  })}`

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title={normalizedTicker}
        subtitle={`${companyName} · Unified view across portfolio, watchlist, analysis, and journal.`}
        actions={
          <>
            <Link href="/investing/portfolio" className="ui-btn-secondary">
              Portfolio
            </Link>
            <Link href="/investing/watchlist" className="ui-btn-secondary">
              Watchlist
            </Link>
            <Link href="/investing/analysis" className="ui-btn-secondary">
              Analysis
            </Link>
            <Link href="/investing/journal" className="ui-btn-primary">
              Journal
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DataCard title="Current Status">
          <DataCardRow label="In portfolio" value={holdings.length > 0 ? 'Yes' : 'No'} />
          <DataCardRow label="On watchlist" value={watchlistItem ? 'Yes' : 'No'} />
          <DataCardRow label="Analyses" value={String(analyses.length)} />
        </DataCard>

        <DataCard title="Holding Snapshot">
          <DataCardRow label="Market value" value={formatCurrencyRounded(totalMarketValue)} />
          <DataCardRow label="Weighted gain/loss" value={formatPercent(weightedGainLoss)} />
          <DataCardRow label="Accounts" value={holdingAccounts} />
        </DataCard>

        <DataCard title="Watchlist Snapshot">
          <DataCardRow label="Status" value={watchlistItem?.status ?? '—'} />
          <DataCardRow label="Current price" value={formatCurrency(watchlistItem?.current_price)} />
          <DataCardRow label="Target entry" value={formatCurrency(watchlistItem?.target_entry)} />
        </DataCard>

        <DataCard title="Latest Analysis">
          <DataCardRow label="Verdict" value={latestAnalysisVerdict ?? '—'} />
          <DataCardRow label="Overall score" value={formatScore(latestAnalysis?.overall_score)} />
          <DataCardRow label="Analysis date" value={formatDate(latestAnalysis?.analysis_date)} />
        </DataCard>
      </section>

      <CollapsibleSection
        title="Decision support snapshot"
        subtitle="Research-driven guidance from the latest saved analysis."
        defaultOpen={true}
      >
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DataCard title="Research Summary">
            <DataCardRow label="Verdict" value={latestAnalysisVerdict ?? '—'} />
            <DataCardRow label="Confidence" value={latestAnalysisConfidence ?? '—'} />
            <DataCardRow label="Overall score" value={formatScore(latestAnalysis?.overall_score)} />
          </DataCard>

          <DataCard title="Source Summary">
            <DataCardRow label="Verdict source" value={<SourceBadge source={latestVerdictSource} />} />
            <DataCardRow
              label="Confidence source"
              value={<SourceBadge source={latestConfidenceSource} />}
            />
            <DataCardRow
              label="Valuation source"
              value={<SourceBadge source={latestValuationSource} />}
            />
          </DataCard>

          <DataCard title="Valuation">
            <DataCardRow label="Current price" value={formatCurrency(referenceCurrentPrice)} />
            <DataCardRow
              label="Fair value"
              value={
                latestAnalysis?.fair_value_low != null || latestAnalysis?.fair_value_high != null
                  ? `${formatCurrency(latestAnalysis?.fair_value_low)} – ${formatCurrency(latestAnalysis?.fair_value_high)}`
                  : '—'
              }
            />
            <DataCardRow label="Valuation status" value={analysisValuationStatus ?? '—'} />
          </DataCard>

          <DataCard title="Portfolio / Watchlist Hints">
            <DataCardRow label="Watchlist hint" value={watchlistActionHint ?? '—'} />
            <DataCardRow label="Portfolio hint" value={portfolioActionHint ?? '—'} />
            <DataCardRow label="Thesis status" value={primaryHolding?.thesis_status ?? '—'} />
          </DataCard>
        </section>
      </CollapsibleSection>

      <CollapsibleSection
        title="Quick actions"
        subtitle="Jump into the related workflow for this ticker."
        defaultOpen={true}
      >
        <TickerActionBar
          addHoldingHref={addHoldingHref}
          addWatchlistHref={addWatchlistHref}
          createAnalysisHref={createAnalysisHref}
          createJournalHref={createJournalHref}
          hasHolding={holdings.length > 0}
          hasWatchlistItem={!!watchlistItem}
          hasAnalysis={!!latestAnalysis}
          ticker={normalizedTicker}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Portfolio details"
        subtitle="Holding-level snapshot for this ticker."
        defaultOpen={true}
      >
        {holdings.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            This ticker is not currently in the portfolio.
          </div>
        ) : (
          <div className="space-y-3">
            <DataCard title="Position Summary">
              <DataCardRow label="Total market value" value={formatCurrencyRounded(totalMarketValue)} />
              <DataCardRow label="Accounts" value={holdingAccounts} />
              <DataCardRow label="Buckets" value={holdingBuckets} />
            </DataCard>

            {holdings.map((holding) => {
              const holdingValuationStatus = getValuationStatus({
                currentPrice: holding.current_price,
                fairValueLow: latestAnalysis?.fair_value_low ?? null,
                fairValueHigh: latestAnalysis?.fair_value_high ?? null,
              })

              const holdingActionHint = getPortfolioActionHint({
                latestVerdict: latestAnalysisVerdict,
                latestConfidence: latestAnalysisConfidence,
                valuationStatus: holdingValuationStatus,
                thesisStatus: holding.thesis_status,
              })

              return (
                <div key={holding.id} className="ui-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                        {holding.account}
                      </div>
                      <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                        {holding.bucket}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                        {holding.sector}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {formatCurrencyRounded(holding.market_value)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <DataCardRow label="Shares" value={String(holding.shares)} />
                    <DataCardRow label="Avg cost" value={formatCurrency(holding.avg_cost)} />
                    <DataCardRow label="Current price" value={formatCurrency(holding.current_price)} />
                    <DataCardRow label="Gain/Loss" value={formatPercent(holding.gain_loss_pct)} />
                    <DataCardRow label="Date bought" value={formatDate(holding.date_bought)} />
                    <DataCardRow label="Thesis status" value={holding.thesis_status} />
                    <DataCardRow label="Valuation status" value={holdingValuationStatus ?? '—'} />
                    <DataCardRow label="Action hint" value={holdingActionHint ?? '—'} />
                  </div>

                  {holding.thesis ? (
                    <div className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                        Thesis:
                      </span>{' '}
                      {holding.thesis}
                    </div>
                  ) : null}

                  {holding.thesis_breakers ? (
                    <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                        Thesis breakers:
                      </span>{' '}
                      {holding.thesis_breakers}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Watchlist snapshot"
        subtitle="Latest watchlist state for this ticker."
        defaultOpen={false}
      >
        {!watchlistItem ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No watchlist entry found for this ticker.
          </div>
        ) : (
          <div className="ui-card p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <DataCardRow label="Status" value={watchlistItem.status} />
              <DataCardRow label="Date added" value={formatDate(watchlistItem.date_added)} />
              <DataCardRow label="Current price" value={formatCurrency(watchlistItem.current_price)} />
              <DataCardRow label="Target entry" value={formatCurrency(watchlistItem.target_entry)} />
              <DataCardRow
                label="Fair value"
                value={
                  watchlistItem.fair_value_low != null || watchlistItem.fair_value_high != null
                    ? `${formatCurrency(watchlistItem.fair_value_low)} – ${formatCurrency(watchlistItem.fair_value_high)}`
                    : '—'
                }
              />
              <DataCardRow
                label="Discount to entry"
                value={formatPercent(watchlistItem.discount_to_entry)}
              />
              <DataCardRow label="Action hint" value={watchlistActionHint ?? '—'} />
              <DataCardRow label="Latest analysis verdict" value={latestAnalysisVerdict ?? '—'} />
            </div>

            {watchlistItem.why_watching ? (
              <div className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                {watchlistItem.why_watching}
              </div>
            ) : null}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Analysis history"
        subtitle="Latest thesis, verdict, and score details."
        defaultOpen={false}
      >
        {analyses.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No analysis history found for this ticker.
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis) => {
              const analysisVerdict = analysis.verdict ?? analysis.verdict_auto ?? null
              const analysisConfidence = analysis.confidence ?? analysis.confidence_auto ?? null
              const analysisVerdictSource = getManualOrAutoSource({
                manualValue: analysis.verdict,
                autoValue: analysis.verdict_auto,
              })
              const analysisConfidenceSource = getManualOrAutoSource({
                manualValue: analysis.confidence,
                autoValue: analysis.confidence_auto,
              })
              const valuationStatus = getValuationStatus({
                currentPrice: referenceCurrentPrice,
                fairValueLow: analysis.fair_value_low ?? null,
                fairValueHigh: analysis.fair_value_high ?? null,
              })

              return (
                <div key={analysis.id} className="ui-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                        {formatDate(analysis.analysis_date)}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                        {analysis.sector}
                      </div>
                    </div>
                    <div className={`text-right text-sm font-medium ${getVerdictTone(analysisVerdict)}`}>
                      {analysisVerdict ?? '—'}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <DataCardRow label="Overall score" value={formatScore(analysis.overall_score)} />
                    <DataCardRow label="Confidence" value={analysisConfidence ?? '—'} />
                    <DataCardRow label="Verdict source" value={<SourceBadge source={analysisVerdictSource} />} />
                    <DataCardRow
                      label="Confidence source"
                      value={<SourceBadge source={analysisConfidenceSource} />}
                    />
                    <DataCardRow label="Moat score" value={formatScore(analysis.moat_score)} />
                    <DataCardRow label="Valuation score" value={formatScore(analysis.valuation_score)} />
                    <DataCardRow label="ROIC score" value={formatScore(analysis.roic_score)} />
                    <DataCardRow
                      label="Fair value"
                      value={
                        analysis.fair_value_low != null || analysis.fair_value_high != null
                          ? `${formatCurrency(analysis.fair_value_low)} – ${formatCurrency(analysis.fair_value_high)}`
                          : '—'
                      }
                    />
                    <DataCardRow label="Valuation status" value={valuationStatus ?? '—'} />
                  </div>

                  {analysis.thesis ? (
                    <div className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                        Thesis:
                      </span>{' '}
                      {analysis.thesis}
                    </div>
                  ) : null}

                  {analysis.thesis_breakers ? (
                    <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                        Breakers:
                      </span>{' '}
                      {analysis.thesis_breakers}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Journal history"
        subtitle="Decision trail for buys, trims, sells, and holds."
        defaultOpen={false}
      >
        {journalEntries.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No journal history found for this ticker.
          </div>
        ) : (
          <div className="space-y-3">
            {journalEntries.map((entry) => (
              <div key={entry.id} className="ui-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {formatDate(entry.entry_date)}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {entry.account}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      Entry #{entry.entry_number}
                    </div>
                  </div>
                  <div className={`text-right text-sm font-medium ${getActionTone(entry.action)}`}>
                    {entry.action}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <DataCardRow label="Shares" value={entry.shares == null ? '—' : String(entry.shares)} />
                  <DataCardRow label="Price" value={formatCurrency(entry.price)} />
                  <DataCardRow
                    label="Weight after"
                    value={formatPercent(entry.portfolio_weight_after)}
                  />
                  <DataCardRow label="Score" value={formatScore(entry.scorecard_overall)} />
                  <DataCardRow label="Emotion" value={entry.emotional_state ?? '—'} />
                  <DataCardRow label="Framework" value={entry.framework_supported ?? '—'} />
                </div>

                {entry.reasoning ? (
                  <div className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                    {entry.reasoning}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {latestJournal ? (
        <CollapsibleSection
          title="Review cadence"
          subtitle="Nearest review timing from the latest journal entry."
          defaultOpen={false}
        >
          <DataCard title="Latest review dates">
            <DataCardRow label="3M review due" value={formatDate(latestJournal.review_due_3m)} />
            <DataCardRow label="12M review due" value={formatDate(latestJournal.review_due_12m)} />
            <DataCardRow
              label="Latest 3M review"
              value={latestJournal.three_month_review ? 'Completed' : 'Pending'}
            />
          </DataCard>
        </CollapsibleSection>
      ) : null}
    </div>
  )
}