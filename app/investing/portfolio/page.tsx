'use client'

import { useEffect, useMemo, useState } from 'react'
import { createInvestingSupabaseBrowserClient } from '@/app/investing/lib/supabase'
import type { BucketTarget, Holding, SectorTarget } from '@/app/investing/types'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'

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

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPrice(value: number | null | undefined) {
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

function getSectorStatus(pct: number, min: number | null, max: number | null) {
  if (min == null || max == null) return null
  if (pct < min) return { label: 'Under', color: 'text-amber-600 dark:text-amber-400' }
  if (pct > max) return { label: 'Over', color: 'text-red-600 dark:text-red-400' }
  return { label: 'In range', color: 'text-emerald-600 dark:text-emerald-400' }
}

function SkeletonCard() {
  return (
    <div className="ui-card p-4">
      <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
      </div>
    </div>
  )
}

export default function InvestingPortfolioPage() {
  const supabase = useMemo(() => createInvestingSupabaseBrowserClient(), [])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [sectorTargets, setSectorTargets] = useState<SectorTarget[]>([])
  const [bucketTargets, setBucketTargets] = useState<BucketTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const [holdingsRes, sectorTargetsRes, bucketTargetsRes] = await Promise.all([
        supabase
          .from('holdings')
          .select('*')
          .order('market_value', { ascending: false }),
        supabase
          .from('sector_targets')
          .select('*')
          .order('sector', { ascending: true }),
        supabase
          .from('bucket_targets')
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

  const summary = useMemo(() => {
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

    const totalGainLosspctWeighted =
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

    const tfsaValue = holdings
      .filter((holding) => holding.account === 'TFSA')
      .reduce((sum, holding) => sum + Number(holding.market_value ?? 0), 0)

    const nonRegisteredValue = holdings
      .filter((holding) => holding.account === 'Non-registered')
      .reduce((sum, holding) => sum + Number(holding.market_value ?? 0), 0)

    return {
      totalValue,
      holdingsCount: holdings.length,
      weightedGainLossPct: totalGainLosspctWeighted,
      cashValue,
      tfsaValue,
      nonRegisteredValue,
    }
  }, [holdings])

  const sectorExposure = useMemo<SectorExposureRow[]>(() => {
    const totalValue = summary.totalValue
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
  }, [holdings, sectorTargets, summary.totalValue])

  const bucketExposure = useMemo<BucketExposureRow[]>(() => {
    const totalValue = summary.totalValue
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
  }, [holdings, bucketTargets, summary.totalValue])

  const topHoldings = useMemo(() => holdings.slice(0, 5), [holdings])

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-[#e6eaf0]">
          Portfolio
        </h1>
        <p className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
          Current positions, account split, sector balance, and allocation buckets.
        </p>
      </header>

      {error ? (
        <div className="ui-card border border-red-200 p-4 text-sm text-red-700 dark:border-red-900 dark:text-[#f0a3a3]">
          {error}
        </div>
      ) : null}

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
              <DataCardRow label="Total value" value={formatCurrency(summary.totalValue)} />
              <DataCardRow label="Total holdings" value={String(summary.holdingsCount)} />
              <DataCardRow
                label="Weighted gain/loss"
                value={formatPercent(summary.weightedGainLossPct)}
              />
            </DataCard>

            <DataCard title="Accounts">
              <DataCardRow label="TFSA" value={formatCurrency(summary.tfsaValue)} />
              <DataCardRow
                label="Non-registered"
                value={formatCurrency(summary.nonRegisteredValue)}
              />
              <DataCardRow label="Cash" value={formatCurrency(summary.cashValue)} />
            </DataCard>

            <DataCard title="Top Holdings">
              {topHoldings.length === 0 ? (
                <DataCardRow label="No holdings yet" value="—" />
              ) : (
                topHoldings.map((holding) => (
                  <DataCardRow
                    key={holding.id}
                    label={holding.ticker}
                    value={formatCurrency(holding.market_value)}
                  />
                ))
              )}
            </DataCard>
          </>
        )}
      </section>

      <CollapsibleSection
        title="Sector exposure"
        subtitle="Compare live sector weights against target ranges."
        defaultOpen={true}
      >
        {loading ? (
          <SkeletonCard />
        ) : sectorExposure.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No sector exposure data yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sectorExposure.map((row) => (
              <div key={row.sector} className="ui-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {row.sector}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {formatCurrency(row.marketValue)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {formatPercent(row.pct)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      Target {formatPercent(row.targetMin)} – {formatPercent(row.targetMax)}
                    </div>
                    {(() => {
                      const status = getSectorStatus(row.pct, row.targetMin, row.targetMax)
                      return status ? (
                        <div className={`mt-1 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Allocation buckets"
        subtitle="Check portfolio mix across core, growth, special situations, and cash."
        defaultOpen={false}
      >
        {loading ? (
          <SkeletonCard />
        ) : bucketExposure.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No bucket allocation data yet.
          </div>
        ) : (
          <div className="space-y-3">
            {bucketExposure.map((row) => (
              <div key={row.bucket} className="ui-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {row.bucket}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {formatCurrency(row.marketValue)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {formatPercent(row.pct)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      Target {formatPercent(row.target)} · Range {formatPercent(row.targetMin)} –{' '}
                      {formatPercent(row.targetMax)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Holdings list"
        subtitle="Full holdings table for detailed review."
        defaultOpen={false}
      >
        {loading ? (
          <SkeletonCard />
        ) : holdings.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No holdings found.
          </div>
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Company</th>
                  <th>Account</th>
                  <th>Bucket</th>
                  <th>Shares</th>
                  <th>Avg Cost</th>
                  <th>Current Price</th>
                  <th>Market Value</th>
                  <th>Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => (
                  <tr key={holding.id}>
                    <td className="font-medium">{holding.ticker}</td>
                    <td>{holding.company}</td>
                    <td>{holding.account}</td>
                    <td>{holding.bucket ?? '—'}</td>
                    <td>{holding.shares}</td>
                    <td>{formatPrice(holding.avg_cost)}</td>
                    <td>{formatPrice(holding.current_price)}</td>
                    <td>{formatCurrency(holding.market_value)}</td>
                    <td>{formatPercent(holding.gain_loss_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}