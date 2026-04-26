'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type {
  BucketTarget,
  DecisionJournalEntry,
  Holding,
  QuarterlyReview,
  SectorTarget,
  StockAnalysis,
  WatchlistItem,
} from '@/app/investing/types'
import { InvestingPageHeader } from '@/components/investing/InvestingPageHeader'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { InlineStatusBanner } from '@/components/ui/InlineStatusBanner'

type SectorExposureRow = {
  sector: string
  marketValue: number
  pct: number
  targetMin: number | null
  targetMax: number | null
}

type BucketExposureRow = {
  bucket: string
  marketValue: number
  pct: number
  target: number | null
  targetMin: number | null
  targetMax: number | null
}

type EnrichedWatchlistItem = WatchlistItem & {
  latest_analysis_overall_score?: number | null
  latest_analysis_verdict?: StockAnalysis['verdict'] | null
  latest_analysis_confidence?: StockAnalysis['confidence'] | string | null
  latest_analysis_fair_value_low?: number | null
  latest_analysis_fair_value_high?: number | null
  latest_analysis_date?: string | null
  watchlist_action_hint?: 'Ready to buy' | 'Keep watching' | 'Too extended' | 'Needs new analysis' | null
}

type EnrichedHolding = Holding & {
  latest_analysis_overall_score?: number | null
  latest_analysis_verdict?: StockAnalysis['verdict'] | null
  latest_analysis_confidence?: StockAnalysis['confidence'] | string | null
  latest_analysis_fair_value_low?: number | null
  latest_analysis_fair_value_high?: number | null
  latest_analysis_date?: string | null
  valuation_status?: 'Below fair value' | 'Within range' | 'Above fair value' | null
  portfolio_action_hint?: 'Add candidate' | 'Hold' | 'Trim candidate' | 'Review thesis' | null
}

function SkeletonCard() {
  return (
    <div className="ui-card p-4">
      <div className="h-4 w-36 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
      </div>
    </div>
  )
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrency2(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(1)
}

function getSectorStatus(pct: number, min: number | null, max: number | null) {
  if (min == null || max == null) return null
  if (pct < min) return 'Underweight'
  if (pct > max) return 'Overweight'
  return 'In range'
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

export default function InvestingDashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [holdings, setHoldings] = useState<EnrichedHolding[]>([])
  const [watchlist, setWatchlist] = useState<EnrichedWatchlistItem[]>([])
  const [analyses, setAnalyses] = useState<StockAnalysis[]>([])
  const [journalEntries, setJournalEntries] = useState<DecisionJournalEntry[]>([])
  const [quarterlyReviews, setQuarterlyReviews] = useState<QuarterlyReview[]>([])
  const [sectorTargets, setSectorTargets] = useState<SectorTarget[]>([])
  const [bucketTargets, setBucketTargets] = useState<BucketTarget[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const [
        holdingsRes,
        watchlistRes,
        analysesRes,
        journalRes,
        reviewsRes,
        sectorTargetsRes,
        bucketTargetsRes,
      ] = await Promise.all([
        supabase
          .from('investing_holdings')
          .select('*')
          .order('market_value', { ascending: false }),
        supabase
          .from('investing_watchlist')
          .select('*')
          .order('date_added', { ascending: false }),
        supabase
          .from('investing_stock_analyses')
          .select('*')
          .order('analysis_date', { ascending: false }),
        supabase
          .from('investing_decision_journal')
          .select('*')
          .order('entry_date', { ascending: false }),
        supabase
          .from('investing_quarterly_reviews')
          .select('*')
          .order('review_date', { ascending: false })
          .limit(4),
        supabase
          .from('investing_sector_targets')
          .select('*')
          .order('sector', { ascending: true }),
        supabase
          .from('investing_bucket_targets')
          .select('*')
          .order('bucket', { ascending: true }),
      ])

      if (cancelled) return

      const errors: string[] = []

      const analysesData = (analysesRes.data ?? []) as StockAnalysis[]
      if (analysesRes.error) {
        errors.push(`Analyses: ${analysesRes.error.message}`)
      } else {
        setAnalyses(analysesData)
      }

      const latestAnalysisByTicker = new Map<string, StockAnalysis>()
      for (const analysis of analysesData) {
        const ticker = analysis.ticker?.toUpperCase?.() ?? ''
        if (!ticker) continue
        if (!latestAnalysisByTicker.has(ticker)) {
          latestAnalysisByTicker.set(ticker, analysis)
        }
      }

      if (holdingsRes.error) {
        errors.push(`Holdings: ${holdingsRes.error.message}`)
      } else {
        const enrichedHoldings: EnrichedHolding[] = ((holdingsRes.data ?? []) as Holding[]).map(
          (holding) => {
            const latestAnalysis = latestAnalysisByTicker.get(holding.ticker.toUpperCase())
            const latestVerdict = latestAnalysis?.verdict ?? latestAnalysis?.verdict_auto ?? null
            const latestConfidence =
              latestAnalysis?.confidence ?? latestAnalysis?.confidence_auto ?? null
            const latestFairValueLow = latestAnalysis?.fair_value_low ?? null
            const latestFairValueHigh = latestAnalysis?.fair_value_high ?? null
            const valuationStatus = getValuationStatus({
              currentPrice: holding.current_price,
              fairValueLow: latestFairValueLow,
              fairValueHigh: latestFairValueHigh,
            })

            return {
              ...holding,
              latest_analysis_overall_score: latestAnalysis?.overall_score ?? null,
              latest_analysis_verdict: latestVerdict,
              latest_analysis_confidence: latestConfidence,
              latest_analysis_fair_value_low: latestFairValueLow,
              latest_analysis_fair_value_high: latestFairValueHigh,
              latest_analysis_date: latestAnalysis?.analysis_date ?? null,
              valuation_status: valuationStatus,
              portfolio_action_hint: getPortfolioActionHint({
                latestVerdict,
                latestConfidence,
                valuationStatus,
                thesisStatus: holding.thesis_status,
              }),
            }
          }
        )
        setHoldings(enrichedHoldings)
      }

      if (watchlistRes.error) {
        errors.push(`Watchlist: ${watchlistRes.error.message}`)
      } else {
        const enrichedWatchlist: EnrichedWatchlistItem[] = ((watchlistRes.data ?? []) as WatchlistItem[]).map(
          (item) => {
            const latestAnalysis = latestAnalysisByTicker.get(item.ticker.toUpperCase())
            const latestVerdict = latestAnalysis?.verdict ?? latestAnalysis?.verdict_auto ?? null
            const latestConfidence =
              latestAnalysis?.confidence ?? latestAnalysis?.confidence_auto ?? null
            const latestFairValueLow = latestAnalysis?.fair_value_low ?? null
            const latestFairValueHigh = latestAnalysis?.fair_value_high ?? null

            return {
              ...item,
              latest_analysis_overall_score: latestAnalysis?.overall_score ?? null,
              latest_analysis_verdict: latestVerdict,
              latest_analysis_confidence: latestConfidence,
              latest_analysis_fair_value_low: latestFairValueLow,
              latest_analysis_fair_value_high: latestFairValueHigh,
              latest_analysis_date: latestAnalysis?.analysis_date ?? null,
              watchlist_action_hint: getWatchlistActionHint({
                latestVerdict,
                latestConfidence,
                currentPrice: item.current_price,
                fairValueLow: latestFairValueLow,
                fairValueHigh: latestFairValueHigh,
              }),
            }
          }
        )
        setWatchlist(enrichedWatchlist)
      }

      if (journalRes.error) {
        errors.push(`Journal: ${journalRes.error.message}`)
      } else {
        setJournalEntries((journalRes.data ?? []) as DecisionJournalEntry[])
      }

      if (reviewsRes.error) {
        errors.push(`Reviews: ${reviewsRes.error.message}`)
      } else {
        setQuarterlyReviews((reviewsRes.data ?? []) as QuarterlyReview[])
      }

      if (sectorTargetsRes.error) {
        errors.push(`Sector targets: ${sectorTargetsRes.error.message}`)
      } else {
        setSectorTargets((sectorTargetsRes.data ?? []) as SectorTarget[])
      }

      if (bucketTargetsRes.error) {
        errors.push(`Bucket targets: ${bucketTargetsRes.error.message}`)
      } else {
        setBucketTargets((bucketTargetsRes.data ?? []) as BucketTarget[])
      }

      if (errors.length > 0) {
        setError(errors.join(' · '))
      }

      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const portfolioSummary = useMemo(() => {
    const totalValue = holdings.reduce(
      (sum, holding) => sum + Number(holding.market_value ?? 0),
      0
    )

    const equityHoldings = holdings.filter(
      (h) => h.bucket !== 'TFSA Cash' && h.bucket !== 'Non-registered Cash'
    )

    const equityValue = equityHoldings.reduce(
      (sum, holding) => sum + Number(holding.market_value ?? 0),
      0
    )

    const weightedGainLossPct =
      equityValue > 0
        ? equityHoldings.reduce((sum, holding) => {
            const marketValue = Number(holding.market_value ?? 0)
            const gainLossPct = Number(holding.gain_loss_pct ?? 0)
            return sum + (marketValue / equityValue) * gainLossPct
          }, 0)
        : 0

    const cashValue = holdings
      .filter(
        (holding) =>
          holding.bucket === 'TFSA Cash' || holding.bucket === 'Non-registered Cash'
      )
      .reduce((sum, holding) => sum + Number(holding.market_value ?? 0), 0)

    return {
      totalValue,
      holdingsCount: holdings.length,
      equityValue,
      cashValue,
      weightedGainLossPct,
    }
  }, [holdings])

  const sectorExposure = useMemo<SectorExposureRow[]>(() => {
    const totalValue = portfolioSummary.totalValue
    const map = new Map<string, number>()

    const equityHoldings = holdings.filter(
      (h) => h.bucket !== 'TFSA Cash' && h.bucket !== 'Non-registered Cash'
    )

    for (const holding of equityHoldings) {
      const sector = holding.sector || 'Unassigned'
      const marketValue = Number(holding.market_value ?? 0)
      map.set(sector, (map.get(sector) ?? 0) + marketValue)
    }

    return Array.from(map.entries())
      .map(([sector, marketValue]) => {
        const target = sectorTargets.find((row) => row.sector === sector)
        return {
          sector,
          marketValue,
          pct: totalValue > 0 ? (marketValue / totalValue) * 100 : 0,
          targetMin: target?.min_pct ?? null,
          targetMax: target?.max_pct ?? null,
        }
      })
      .sort((a, b) => b.marketValue - a.marketValue)
  }, [holdings, sectorTargets, portfolioSummary.totalValue])

  const bucketExposure = useMemo<BucketExposureRow[]>(() => {
    const totalValue = portfolioSummary.totalValue
    const map = new Map<string, number>()

    for (const holding of holdings) {
      const bucket = holding.bucket || 'Unassigned'
      const marketValue = Number(holding.market_value ?? 0)
      map.set(bucket, (map.get(bucket) ?? 0) + marketValue)
    }

    return Array.from(map.entries())
      .map(([bucket, marketValue]) => {
        const target = bucketTargets.find((row) => row.bucket === bucket)
        return {
          bucket,
          marketValue,
          pct: totalValue > 0 ? (marketValue / totalValue) * 100 : 0,
          target: target?.target_pct ?? null,
          targetMin: target?.min_pct ?? null,
          targetMax: target?.max_pct ?? null,
        }
      })
      .sort((a, b) => b.marketValue - a.marketValue)
  }, [holdings, bucketTargets, portfolioSummary.totalValue])

  const watchlistSummary = useMemo(() => {
    const readyToBuy = watchlist.filter((item) => item.watchlist_action_hint === 'Ready to buy')
    const keepWatching = watchlist.filter((item) => item.watchlist_action_hint === 'Keep watching')
    const needsNewAnalysis = watchlist.filter(
      (item) => item.watchlist_action_hint === 'Needs new analysis'
    )

    const topItems = [...watchlist]
      .sort((a, b) => {
        const aRank =
          a.watchlist_action_hint === 'Ready to buy'
            ? 0
            : a.watchlist_action_hint === 'Keep watching'
              ? 1
              : a.watchlist_action_hint === 'Needs new analysis'
                ? 2
                : 3
        const bRank =
          b.watchlist_action_hint === 'Ready to buy'
            ? 0
            : b.watchlist_action_hint === 'Keep watching'
              ? 1
              : b.watchlist_action_hint === 'Needs new analysis'
                ? 2
                : 3
        if (aRank !== bRank) return aRank - bRank
        return Number(b.latest_analysis_overall_score ?? -999) - Number(a.latest_analysis_overall_score ?? -999)
      })
      .slice(0, 5)

    return {
      readyToBuyCount: readyToBuy.length,
      keepWatchingCount: keepWatching.length,
      needsNewAnalysisCount: needsNewAnalysis.length,
      topItems,
    }
  }, [watchlist])

  const reviewsSummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)

    const due3m = journalEntries.filter(
      (entry) =>
        entry.review_due_3m != null &&
        entry.review_due_3m <= today &&
        !entry.three_month_review
    )

    const due12m = journalEntries.filter(
      (entry) =>
        entry.review_due_12m != null &&
        entry.review_due_12m <= today &&
        !entry.twelve_month_review
    )

    const latestQuarterlyReview = quarterlyReviews[0] ?? null
    const latestJournalEntry = journalEntries[0] ?? null

    return {
      due3m,
      due12m,
      due3mCount: due3m.length,
      due12mCount: due12m.length,
      latestQuarterlyReview,
      latestJournalEntry,
    }
  }, [journalEntries, quarterlyReviews])

  const topSector = sectorExposure[0] ?? null

  const mostUnderweightSector = useMemo(() => {
    const candidates = sectorExposure
      .filter((row) => row.targetMin != null && row.pct < (row.targetMin ?? 0))
      .sort((a, b) => (a.pct - (a.targetMin ?? 0)) - (b.pct - (b.targetMin ?? 0)))

    return candidates[0] ?? null
  }, [sectorExposure])

  const mostOverweightSector = useMemo(() => {
    const candidates = sectorExposure
      .filter((row) => row.targetMax != null && row.pct > (row.targetMax ?? 0))
      .sort((a, b) => (b.pct - (b.targetMax ?? 0)) - (a.pct - (a.targetMax ?? 0)))

    return candidates[0] ?? null
  }, [sectorExposure])

  const latestAnalyses = useMemo(() => analyses.slice(0, 5), [analyses])

  const highestConvictionNames = useMemo(() => {
    return [...analyses]
      .filter((analysis) => {
        const verdict = analysis.verdict ?? analysis.verdict_auto ?? null
        const confidence = analysis.confidence ?? analysis.confidence_auto ?? null
        return (verdict === 'Strong Buy' || verdict === 'Buy') && confidence === 'High'
      })
      .sort(
        (a, b) => Number(b.overall_score ?? -999) - Number(a.overall_score ?? -999)
      )
      .slice(0, 5)
  }, [analyses])

  const holdingsNeedingReview = useMemo(() => {
    return holdings
      .filter(
        (holding) =>
          holding.portfolio_action_hint === 'Review thesis' ||
          holding.portfolio_action_hint === 'Trim candidate'
      )
      .slice(0, 5)
  }, [holdings])

  const thesisRiskAlerts = useMemo(() => {
    return holdings
      .filter(
        (holding) =>
          holding.thesis_status === 'Broken' || holding.thesis_status === 'Weakening'
      )
      .slice(0, 5)
  }, [holdings])

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Shayna — Investment Dashboard"
        subtitle="Command center for portfolio health, watchlist opportunities, review cadence, and conviction signals."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/investing/portfolio" className="ui-btn-secondary">
              Open Portfolio
            </Link>
            <Link href="/investing/watchlist" className="ui-btn-secondary">
              Open Watchlist
            </Link>
            <Link href="/investing/analysis" className="ui-btn-secondary">
              Open Analysis
            </Link>
            <Link href="/investing/journal" className="ui-btn-secondary">
              Open Journal
            </Link>
          </div>
        }
      />

      <InlineStatusBanner tone="error" message={error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <DataCard title="Portfolio Summary">
              <DataCardRow
                label="Total value"
                value={formatCurrency(portfolioSummary.totalValue)}
              />
              <DataCardRow
                label="Holdings"
                value={String(portfolioSummary.holdingsCount)}
              />
              <DataCardRow
                label="Equity exposure"
                value={formatCurrency(portfolioSummary.equityValue)}
              />
              <DataCardRow
                label="Cash position"
                value={formatCurrency(portfolioSummary.cashValue)}
              />
              <DataCardRow
                label="Weighted gain/loss"
                value={formatPercent(portfolioSummary.weightedGainLossPct)}
              />
            </DataCard>

            <DataCard title="Watchlist Signals">
              <DataCardRow
                label="Ready to buy"
                value={String(watchlistSummary.readyToBuyCount)}
              />
              <DataCardRow
                label="Keep watching"
                value={String(watchlistSummary.keepWatchingCount)}
              />
              <DataCardRow
                label="Needs new analysis"
                value={String(watchlistSummary.needsNewAnalysisCount)}
              />
              <DataCardRow
                label="Total watchlist"
                value={String(watchlist.length)}
              />
            </DataCard>

            <DataCard title="Review Pressure">
              <DataCardRow
                label="3M reviews due"
                value={String(reviewsSummary.due3mCount)}
              />
              <DataCardRow
                label="12M reviews due"
                value={String(reviewsSummary.due12mCount)}
              />
              <DataCardRow
                label="Thesis risk alerts"
                value={String(thesisRiskAlerts.length)}
              />
              <DataCardRow
                label="Holdings needing review"
                value={String(holdingsNeedingReview.length)}
              />
            </DataCard>
          </>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <DataCard title="Sector Exposure">
              <DataCardRow
                label="Top sector"
                value={
                  topSector
                    ? `${topSector.sector} (${formatPercent(topSector.pct)})`
                    : '—'
                }
              />
              <DataCardRow
                label="Most underweight"
                value={
                  mostUnderweightSector
                    ? `${mostUnderweightSector.sector} (${getSectorStatus(
                        mostUnderweightSector.pct,
                        mostUnderweightSector.targetMin,
                        mostUnderweightSector.targetMax
                      )})`
                    : '—'
                }
              />
              <DataCardRow
                label="Most overweight"
                value={
                  mostOverweightSector
                    ? `${mostOverweightSector.sector} (${getSectorStatus(
                        mostOverweightSector.pct,
                        mostOverweightSector.targetMin,
                        mostOverweightSector.targetMax
                      )})`
                    : '—'
                }
              />
            </DataCard>

            <DataCard title="Allocation Buckets">
              <DataCardRow
                label="Core compounder"
                value={formatPercent(
                  bucketExposure.find((row) => row.bucket === 'Core compounder')?.pct ?? null
                )}
              />
              <DataCardRow
                label="Quality growth"
                value={formatPercent(
                  bucketExposure.find((row) => row.bucket === 'Quality growth')?.pct ?? null
                )}
              />
              <DataCardRow
                label="Special opportunity"
                value={formatPercent(
                  bucketExposure.find((row) => row.bucket === 'Special opportunity')?.pct ?? null
                )}
              />
              <DataCardRow
                label="Cash buckets"
                value={formatPercent(
                  bucketExposure
                    .filter(
                      (row) =>
                        row.bucket === 'TFSA Cash' || row.bucket === 'Non-registered Cash'
                    )
                    .reduce((sum, row) => sum + row.pct, 0)
                )}
              />
            </DataCard>

            <DataCard title="Latest Context">
              <DataCardRow
                label="Latest quarterly review"
                value={
                  reviewsSummary.latestQuarterlyReview
                    ? `${reviewsSummary.latestQuarterlyReview.quarter} · ${formatDate(
                        reviewsSummary.latestQuarterlyReview.review_date
                      )}`
                    : '—'
                }
              />
              <DataCardRow
                label="Latest journal entry"
                value={
                  reviewsSummary.latestJournalEntry
                    ? `${reviewsSummary.latestJournalEntry.ticker} · ${formatDate(
                        reviewsSummary.latestJournalEntry.entry_date
                      )}`
                    : '—'
                }
              />
              <DataCardRow
                label="Latest analysis"
                value={
                  latestAnalyses[0]
                    ? `${latestAnalyses[0].ticker} · ${formatDate(latestAnalyses[0].analysis_date)}`
                    : '—'
                }
              />
            </DataCard>
          </>
        )}
      </section>

      <CollapsibleSection
        title="Top watchlist opportunities"
        subtitle="Most actionable watchlist names based on current hint and latest analysis."
        defaultOpen={true}
      >
        {loading ? (
          <SkeletonCard />
        ) : watchlistSummary.topItems.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No active watchlist signals yet.
          </div>
        ) : (
          <div className="space-y-3">
            {watchlistSummary.topItems.map((item) => (
              <Link
                key={item.id}
                href={`/investing/ticker/${encodeURIComponent(item.ticker)}`}
                className="ui-card block p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {item.ticker} · {item.company}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {item.watchlist_action_hint ?? item.status}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      Verdict: {item.latest_analysis_verdict ?? '—'} · Confidence:{' '}
                      {item.latest_analysis_confidence ?? '—'}
                    </div>
                  </div>
                  <div className="text-right text-xs text-neutral-500 dark:text-[#a8b2bf]">
                    <div>Current: {formatCurrency2(item.current_price)}</div>
                    <div>
                      Fair value:{' '}
                      {item.latest_analysis_fair_value_low != null ||
                      item.latest_analysis_fair_value_high != null
                        ? `${formatCurrency2(item.latest_analysis_fair_value_low)} – ${formatCurrency2(item.latest_analysis_fair_value_high)}`
                        : '—'}
                    </div>
                    <div>Score: {formatScore(item.latest_analysis_overall_score)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Holdings needing review"
        subtitle="Positions flagged for thesis review or trim consideration."
        defaultOpen={true}
      >
        {loading ? (
          <SkeletonCard />
        ) : holdingsNeedingReview.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No holdings are currently flagged for review.
          </div>
        ) : (
          <div className="space-y-3">
            {holdingsNeedingReview.map((holding) => (
              <Link
                key={holding.id}
                href={`/investing/ticker/${encodeURIComponent(holding.ticker)}`}
                className="ui-card block p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {holding.ticker} · {holding.company}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {holding.portfolio_action_hint ?? 'Hold'}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      Thesis: {holding.thesis_status} · Valuation: {holding.valuation_status ?? '—'}
                    </div>
                  </div>
                  <div className="text-right text-xs text-neutral-500 dark:text-[#a8b2bf]">
                    <div>Value: {formatCurrency(holding.market_value)}</div>
                    <div>Gain/Loss: {formatPercent(holding.gain_loss_pct)}</div>
                    <div>Verdict: {holding.latest_analysis_verdict ?? '—'}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Overdue journal reviews"
        subtitle="3M and 12M reviews that need follow-up."
        defaultOpen={true}
      >
        {loading ? (
          <SkeletonCard />
        ) : reviewsSummary.due3mCount + reviewsSummary.due12mCount === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No overdue journal reviews.
          </div>
        ) : (
          <div className="space-y-3">
            {[...reviewsSummary.due3m.slice(0, 3), ...reviewsSummary.due12m.slice(0, 3)].map((entry) => (
              <Link
                key={entry.id}
                href={`/investing/ticker/${encodeURIComponent(entry.ticker)}`}
                className="ui-card block p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {entry.ticker} · {entry.action}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      Entry date: {formatDate(entry.entry_date)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-neutral-500 dark:text-[#a8b2bf]">
                    <div>3M due: {formatDate(entry.review_due_3m)}</div>
                    <div>12M due: {formatDate(entry.review_due_12m)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Latest analyses"
        subtitle="Most recent completed analysis work."
        defaultOpen={false}
      >
        {loading ? (
          <SkeletonCard />
        ) : latestAnalyses.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No analyses yet.
          </div>
        ) : (
          <div className="space-y-3">
            {latestAnalyses.map((analysis) => {
              const verdict = analysis.verdict ?? analysis.verdict_auto ?? '—'
              const confidence = analysis.confidence ?? analysis.confidence_auto ?? '—'

              return (
                <Link
                  key={analysis.id}
                  href={`/investing/ticker/${encodeURIComponent(analysis.ticker)}`}
                  className="ui-card block p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                        {analysis.ticker} · {analysis.company}
                      </div>
                      <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                        {verdict} · {confidence}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                        {analysis.sector} · {formatDate(analysis.analysis_date)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      <div>Score: {formatScore(analysis.overall_score)}</div>
                      <div>
                        Fair value:{' '}
                        {analysis.fair_value_low != null || analysis.fair_value_high != null
                          ? `${formatCurrency2(analysis.fair_value_low)} – ${formatCurrency2(analysis.fair_value_high)}`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Highest conviction names"
        subtitle="Strong Buy / Buy names with High confidence."
        defaultOpen={false}
      >
        {loading ? (
          <SkeletonCard />
        ) : highestConvictionNames.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No high-conviction names yet.
          </div>
        ) : (
          <div className="space-y-3">
            {highestConvictionNames.map((analysis) => (
              <Link
                key={analysis.id}
                href={`/investing/ticker/${encodeURIComponent(analysis.ticker)}`}
                className="ui-card block p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {analysis.ticker} · {analysis.company}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {(analysis.verdict ?? analysis.verdict_auto) ?? '—'} ·{' '}
                      {(analysis.confidence ?? analysis.confidence_auto) ?? '—'}
                    </div>
                  </div>
                  <div className="text-right text-xs text-neutral-500 dark:text-[#a8b2bf]">
                    <div>Score: {formatScore(analysis.overall_score)}</div>
                    <div>Date: {formatDate(analysis.analysis_date)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Thesis risk alerts"
        subtitle="Holdings where thesis status has weakened or broken."
        defaultOpen={false}
      >
        {loading ? (
          <SkeletonCard />
        ) : thesisRiskAlerts.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No thesis risk alerts.
          </div>
        ) : (
          <div className="space-y-3">
            {thesisRiskAlerts.map((holding) => (
              <Link
                key={holding.id}
                href={`/investing/ticker/${encodeURIComponent(holding.ticker)}`}
                className="ui-card block p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {holding.ticker} · {holding.company}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {holding.thesis_status}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      {holding.portfolio_action_hint ?? 'Review thesis'}
                    </div>
                  </div>
                  <div className="text-right text-xs text-neutral-500 dark:text-[#a8b2bf]">
                    <div>Value: {formatCurrency(holding.market_value)}</div>
                    <div>Verdict: {holding.latest_analysis_verdict ?? '—'}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Quick navigation"
        subtitle="Jump directly into the core investing workflows."
        defaultOpen={false}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/investing/portfolio" className="ui-card p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700">
            <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Portfolio
            </div>
            <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              Manage holdings, sector balance, and allocation buckets.
            </div>
          </Link>

          <Link href="/investing/watchlist" className="ui-card p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700">
            <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Watchlist
            </div>
            <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              Track ideas, entry ranges, and valuation readiness.
            </div>
          </Link>

          <Link href="/investing/analysis" className="ui-card p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700">
            <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Analysis
            </div>
            <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              Store thesis work, scores, and fair value ranges.
            </div>
          </Link>

          <Link href="/investing/journal" className="ui-card p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700">
            <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Journal
            </div>
            <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              Review decisions and monitor scheduled follow-ups.
            </div>
          </Link>

          <Link href="/investing/reviews" className="ui-card p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700">
            <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Reviews
            </div>
            <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              Track quarterly performance and portfolio discipline.
            </div>
          </Link>

          <Link href="/investing/settings" className="ui-card p-4 transition hover:border-neutral-300 dark:hover:border-neutral-700">
            <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Settings
            </div>
            <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              Configure defaults, targets, and workflow preferences.
            </div>
          </Link>
        </div>
      </CollapsibleSection>
    </div>
  )
}