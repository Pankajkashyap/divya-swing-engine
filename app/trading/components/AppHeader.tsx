'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/app/trading/lib/supabase'

type Props = {
  title: string
}

export function AppHeader({ title }: Props) {
  const pathname = usePathname()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const toggleBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    const loadPendingCount = async () => {
      const { count, error } = await supabase
        .from('pending_actions')
        .select('id', { count: 'exact', head: true })
        .eq('state', 'awaiting_confirmation')
      if (cancelled) return
      if (error) {
        console.error('Pending count load error:', error)
        return
      }
      setPendingCount(count ?? 0)
    }
    void loadPendingCount()
    return () => {
      cancelled = true
    }
  }, [pathname, supabase])

  // Close menu when clicking outside the header
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toggleBtnRef.current?.contains(e.target as Node)) return
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  // Close menu on route change
  useEffect(() => {
    const t = setTimeout(() => setMenuOpen(false), 0)
    return () => clearTimeout(t)
  }, [pathname])

  const navItems = [
    { label: 'Dashboard', href: '/trading' },
    { label: 'Inbox', href: '/trading/inbox', badge: pendingCount },
    { label: 'Candidates', href: '/trading/candidates' },
    { label: 'Universe', href: '/trading/universe' },
    { label: 'Weekly Review', href: '/trading/weekly-review' },
    { label: 'Docs', href: '/trading/docs' },
    { label: 'Settings', href: '/trading/settings' },
  ]

  return (
      <header
        ref={headerRef}
        className="relative z-40 mb-4 border-b border-neutral-200 pb-3 dark:border-neutral-800"
      >
      {/* Top bar — always visible */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-[#e6eaf0]">
          {title}
        </h1>
      <div className="flex shrink-0 items-center gap-2">
        <button
          ref={toggleBtnRef}
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="ui-btn-secondary relative"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span className="text-base leading-none">{menuOpen ? '✕' : '☰'}</span>
          {pendingCount > 0 && !menuOpen && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#7c93ff] text-[9px] font-bold text-[#0f1720]">
              {pendingCount}
            </span>
          )}
        </button>
      </div>
      </div>

      {/* Dropdown nav */}
      {menuOpen && (
        <nav className="absolute right-0 top-full z-50 mt-2 flex w-[min(18rem,calc(100vw-2rem))] flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-[#2a313b] dark:bg-[#181d23]">
          {navItems.map((item) => {
            const isActive =
              item.href === '/trading'
                ? pathname === '/trading'
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${                  isActive
                    ? 'bg-neutral-900 text-white dark:bg-[#7c93ff] dark:text-[#0f1720]'
                    : 'text-neutral-700 hover:bg-neutral-100 dark:text-[#d7dde6] dark:hover:bg-[#20262e]'
                }`}
              >
                <span>{item.label}</span>
                {'badge' in item && item.badge && item.badge > 0 ? (
                  <span className="ui-pill-neutral px-2 py-0.5 text-[11px]">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}