'use client'

import { useEffect, useState } from 'react'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'

function CardSkeleton() {
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

export default function InvestingDashboardPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLoading(false)
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-[#e6eaf0]">
          Shayna — Investment Dashboard
        </h1>
        <p className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
          Long-term portfolio view, allocation health, watchlist signals, and review cadence.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <DataCard title="Portfolio Summary">
              <DataCardRow label="Total value" value="$—" />
              <DataCardRow label="Total holdings" value="—" />
              <DataCardRow label="Cash position" value="—" />
            </DataCard>

            <DataCard title="Sector Exposure">
              <DataCardRow label="Largest sector" value="—" />
              <DataCardRow label="Most underweight" value="—" />
              <DataCardRow label="Most overweight" value="—" />
            </DataCard>

            <DataCard title="Allocation Buckets">
              <DataCardRow label="Core compounder" value="—" />
              <DataCardRow label="Quality growth" value="—" />
              <DataCardRow label="Special opportunity" value="—" />
            </DataCard>
          </>
        )}
      </section>

      <CollapsibleSection
        title="Watchlist alerts"
        subtitle="Upcoming buy opportunities, valuation gaps, and research candidates."
        defaultOpen={true}
      >
        {loading ? (
          <CardSkeleton />
        ) : (
          <DataCard title="Watchlist Alerts">
            <DataCardRow label="Ready to buy" value="—" />
            <DataCardRow label="Approaching entry" value="—" />
            <DataCardRow label="Needs research" value="—" />
          </DataCard>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Upcoming reviews"
        subtitle="Decision journal follow-ups and quarterly review checkpoints."
        defaultOpen={false}
      >
        {loading ? (
          <CardSkeleton />
        ) : (
          <DataCard title="Upcoming Reviews">
            <DataCardRow label="3-month reviews due" value="—" />
            <DataCardRow label="12-month reviews due" value="—" />
            <DataCardRow label="Quarterly review status" value="—" />
          </DataCard>
        )}
      </CollapsibleSection>
    </div>
  )
}