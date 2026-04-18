'use client'

import { useMemo, useState } from 'react'
import { InvestingPageHeader } from '@/components/investing/InvestingPageHeader'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'

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

export default function InvestingDashboardPage() {
  const [loading] = useState(false)

  const summaryCards = useMemo(
    () => [
      {
        title: 'Portfolio Summary',
        rows: [
          ['Total value', '—'],
          ['Equity exposure', '—'],
          ['Cash position', '—'],
        ],
      },
      {
        title: 'Sector Exposure',
        rows: [
          ['Top sector', '—'],
          ['Most underweight', '—'],
          ['Most overweight', '—'],
        ],
      },
      {
        title: 'Allocation Buckets',
        rows: [
          ['Core compounder', '—'],
          ['Quality growth', '—'],
          ['Special opportunity', '—'],
        ],
      },
      {
        title: 'Watchlist Alerts',
        rows: [
          ['Ready to buy', '—'],
          ['Approaching entry', '—'],
          ['Under research', '—'],
        ],
      },
      {
        title: 'Upcoming Reviews',
        rows: [
          ['3M reviews due', '—'],
          ['12M reviews due', '—'],
          ['Quarterly review', '—'],
        ],
      },
    ],
    []
  )

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Shayna — Investment Dashboard"
        subtitle="High-level snapshot of portfolio health, watchlist readiness, review cadence, and allocation posture."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {summaryCards.slice(0, 3).map((card) => (
              <DataCard key={card.title} title={card.title}>
                {card.rows.map(([label, value]) => (
                  <DataCardRow key={label} label={label} value={value} />
                ))}
              </DataCard>
            ))}
          </>
        )}
      </section>

      <CollapsibleSection
        title="Watchlist and review signals"
        subtitle="Priority items first, with secondary details collapsed by default."
        defaultOpen={true}
      >
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {summaryCards.slice(3).map((card) => (
              <DataCard key={card.title} title={card.title}>
                {card.rows.map(([label, value]) => (
                  <DataCardRow key={label} label={label} value={value} />
                ))}
              </DataCard>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}