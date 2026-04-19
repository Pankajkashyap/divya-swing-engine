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

function getSectorStatus(pct: number, min: number | null, max: number | null) {
  if (min == null || max == null) return null
  if (pct < min) return 'Underweight'
  if (pct > max) return 'Overweight'
  return 'In range'
}

export default function InvestingDashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [holdings, setHoldings] = useState<Holding[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
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
          .order('created_at', { ascending: false }),
        supabase
          .from('investing_decision_journal')
          .select('*')
          .order('entry_date', { ascending: false })
          .limit(5),
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

      if (holdingsRes.error) {
        errors.push(`Holdings: ${holdingsRes.error.message}`)
      } else {
        setHoldings((holdingsRes.data ?? []) as Holding[])
      }

      if (watchlistRes.error) {
        errors.push(`Watchlist: ${watchlistRes.error.message}`)
      } else {
        setWatchlist((watchlistRes.data ?? []) as WatchlistItem[])
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
    const readyToBuy = watchlist.filter((item) => item.status === 'Ready to buy')
    const approachingEntry = watchlist.filter(
      (item) => item.status === 'Watching — approaching entry'
    )
    const underResearch = watchlist.filter((item) => item.status === 'Under research')

    return {
      readyToBuyCount: readyToBuy.length,
      approachingEntryCount: approachingEntry.length,
      underResearchCount: underResearch.length,
      topItems: [...readyToBuy, ...approachingEntry, ...underResearch]
        .filter(
          (item, index, array) =>
            array.findIndex((candidate) => candidate.id === item.id) === index
        )
        .slice(0, 5),
    }
  }, [watchlist])

  const reviewsSummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)

    const due3m = journalEntries.filter(
      (entry) => entry.review_due_3m != null && entry.review_due_3m <= today
    )

    const due12m = journalEntries.filter(
      (entry) => entry.review_due_12m != null && entry.review_due_12m <= today
    )

    const latestQuarterlyReview = quarterlyReviews[0] ?? null
    const latestJournalEntry = journalEntries[0] ?? null

    return {
      due3mCount: due3m.length,
      due12mCount: due12m.length,
      latestQuarterlyReview,
      latestJournalEntry,
    }
  }, [journalEntries, quarterlyReviews])

  const topHoldings = useMemo(() => holdings.slice(0, 5), [holdings])

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

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Shayna — Investment Dashboard"
        subtitle="High-level snapshot of portfolio health, watchlist readiness, review cadence, and allocation posture."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/investing/portfolio" className="ui-btn-secondary">
              Open Portfolio
            </Link>
            <Link href="/investing/watchlist" className="ui-btn-secondary">
              Open Watchlist
            </Link>
            <Link href="/investing/reviews" className="ui-btn-secondary">
              Open Reviews
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
                value={
                  formatPercent(
                    bucketExposure.find((row) => row.bucket === 'Core compounder')?.pct ?? null
                  )
                }
              />
              <DataCardRow
                label="Quality growth"
                value={
                  formatPercent(
                    bucketExposure.find((row) => row.bucket === 'Quality growth')?.pct ?? null
                  )
                }
              />
              <DataCardRow
                label="Special opportunity"
                value={
                  formatPercent(
                    bucketExposure.find((row) => row.bucket === 'Special opportunity')?.pct ?? null
                  )
                }
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
          </>
        )}
      </section>

      <CollapsibleSection
        title="Top holdings"
        subtitle="Largest positions by current market value."
        defaultOpen={true}
      >
        {loading ? (
          <SkeletonCard />
        ) : topHoldings.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No holdings yet. Add positions in Portfolio to see portfolio summary here.
          </div>
        ) : (
          <div className="space-y-3">
            {topHoldings.map((holding) => (
              <div key={holding.id} className="ui-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {holding.ticker} · {holding.company}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {holding.account} · {holding.bucket ?? 'Unassigned'} · {holding.sector || 'Unassigned'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {formatCurrency(holding.market_value)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      {formatPercent(holding.gain_loss_pct)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Watchlist and review signals"
        subtitle="Priority items first, with review timing visible in one place."
        defaultOpen={true}
      >
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <DataCard title="Watchlist Alerts">
              <DataCardRow
                label="Ready to buy"
                value={String(watchlistSummary.readyToBuyCount)}
              />
              <DataCardRow
                label="Approaching entry"
                value={String(watchlistSummary.approachingEntryCount)}
              />
              <DataCardRow
                label="Under research"
                value={String(watchlistSummary.underResearchCount)}
              />
              <DataCardRow
                label="Total watchlist"
                value={String(watchlist.length)}
              />
            </DataCard>

            <DataCard title="Upcoming Reviews">
              <DataCardRow
                label="3M reviews due"
                value={String(reviewsSummary.due3mCount)}
              />
              <DataCardRow
                label="12M reviews due"
                value={String(reviewsSummary.due12mCount)}
              />
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
            </DataCard>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Priority watchlist"
        subtitle="Top watchlist names that are closest to action."
        defaultOpen={false}
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
              <div key={item.id} className="ui-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {item.ticker} · {item.company}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {item.status}
                    </div>
                  </div>
                  <div className="text-right text-xs text-neutral-500 dark:text-[#a8b2bf]">
                    <div>Current: {formatCurrency(item.current_price)}</div>
                    <div>Target: {formatCurrency(item.target_entry)}</div>
                  </div>
                </div>
              </div>
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