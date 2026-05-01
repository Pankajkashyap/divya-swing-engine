'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const investingTabs = [
  { label: 'Research', href: '/investing/research' },
  { label: 'Watchlist', href: '/investing/watchlist' },
  { label: 'Portfolio', href: '/investing/portfolio' },
  { label: 'Dashboard', href: '/investing' },
] as const

const journeyStages = [
  { label: 'Research', href: '/investing/research', helper: 'Discover & analyze' },
  { label: 'Watchlist', href: '/investing/watchlist', helper: 'Wait for entry' },
  { label: 'Portfolio', href: '/investing/portfolio', helper: 'Own & manage' },
  { label: 'Dashboard', href: '/investing', helper: 'Monitor & review' },
] as const

function getActiveJourneyIndex(pathname: string) {
  if (pathname === '/investing' || pathname.startsWith('/investing/reviews') || pathname.startsWith('/investing/settings') || pathname.startsWith('/investing/save-views')) {
    return 3
  }
  if (pathname.startsWith('/investing/portfolio') || pathname.startsWith('/investing/journal')) {
    return 2
  }
  if (pathname.startsWith('/investing/watchlist')) {
    return 1
  }
  return 0
}

function InvestingTabNav() {
  const pathname = usePathname()
  const activeJourneyIndex = getActiveJourneyIndex(pathname)

  return (
    <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-30 -mx-4 mb-4 border-b border-neutral-200 bg-neutral-50/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-neutral-50/80 dark:border-neutral-800 dark:bg-[#111418]/95 dark:supports-backdrop-filter:bg-[#111418]/80 sm:-mx-6 sm:px-6">
      <div className="mb-3 flex items-center justify-center gap-0">
        {journeyStages.map((stage, i) => {
          const isActive = i === activeJourneyIndex
          const isPast = i < activeJourneyIndex

          return (
            <div key={stage.label} className="flex items-center">
              {i > 0 ? (
                <div
                  className={`h-0.5 w-6 sm:w-10 ${
                    isPast || isActive ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                />
              ) : null}

              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : isPast
                      ? 'bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                }`}
              >
                {i + 1}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mb-2 flex justify-center gap-4 text-[10px] text-neutral-500 dark:text-[#a8b2bf] sm:gap-8">
        {journeyStages.map((stage) => (
          <span key={stage.label}>{stage.helper}</span>
        ))}
      </div>

      <nav
        aria-label="Investing navigation"
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {investingTabs.map((tab) => {
          const isActive =
            tab.href === '/investing'
              ? pathname === '/investing'
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={isActive ? 'ui-link-pill-active shrink-0' : 'ui-link-pill-idle shrink-0'}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default function InvestingLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="ui-page">
      <section className="mx-auto max-w-7xl">
        <InvestingTabNav />
        {children}
      </section>
    </div>
  )
}