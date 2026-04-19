'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    label: 'Home',
    href: '/',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.25 9.75V20h13.5V9.75" />
      </svg>
    ),
  },
  {
    label: 'Divya',
    href: '/trading',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 19h16" />
        <path d="M6 16 10 11l3 3 5-7" />
      </svg>
    ),
  },
  {
    label: 'Shayna',
    href: '/investing',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 3v18" />
        <path d="M7 8c0-1.657 2.239-3 5-3s5 1.343 5 3-2.239 3-5 3-5 1.343-5 3 2.239 3 5 3 5-1.343 5-3" />
      </svg>
    ),
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/90 dark:border-neutral-800 dark:bg-[#111418]/95 dark:supports-backdrop-filter:bg-[#111418]/90 md:hidden">
      <div className="grid grid-cols-3 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
        {navItems.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 py-2 text-center transition-all duration-150 ${
                active
                  ? 'text-neutral-900 dark:text-[#7c93ff]'
                  : 'text-neutral-500 dark:text-[#a8b2bf]'
              }`}
            >
              <span className="mb-1">{item.icon}</span>
              <span className="text-[12px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}