'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Divya', href: '/trading' },
  { label: 'Shayna', href: '/investing' },
]

export function DesktopNav() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-56px)] w-64 shrink-0 border-r border-neutral-200 bg-white/70 px-4 py-6 backdrop-blur dark:border-neutral-800 dark:bg-[#151a20]/70 md:block">
      <div className="mb-4 px-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-[#a8b2bf]">
          Platform
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? 'ui-link-pill-active w-full justify-start'
                  : 'ui-link-pill-idle w-full justify-start'
              }
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}