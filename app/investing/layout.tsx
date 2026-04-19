'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

const investingTabs = [
  { label: 'Dashboard', href: '/investing' },
  { label: 'Portfolio', href: '/investing/portfolio' },
  { label: 'Watchlist', href: '/investing/watchlist' },
  { label: 'Analysis', href: '/investing/analysis' },
  { label: 'Journal', href: '/investing/journal' },
  { label: 'Reviews', href: '/investing/reviews' },
  { label: 'Settings', href: '/investing/settings' },
] as const

function InvestingTabNav() {
  const pathname = usePathname()

  return (
    <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-30 -mx-4 mb-4 border-b border-neutral-200 bg-neutral-50/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-neutral-50/80 dark:border-neutral-800 dark:bg-[#111418]/95 dark:supports-backdrop-filter:bg-[#111418]/80 sm:-mx-6 sm:px-6">
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
            <a
              key={tab.href}
              href={tab.href}
              className={
                isActive ? 'ui-link-pill-active shrink-0' : 'ui-link-pill-idle shrink-0'
              }
            >
              {tab.label}
            </a>
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