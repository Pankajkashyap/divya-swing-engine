'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/app/trading/lib/supabase'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

type Props = {
  title: string
}

export function AppHeader({ title }: Props) {
  const pathname = usePathname()
  const router = useRouter()
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
    { label: 'Dashboard', href: '/' },
    { label: 'Inbox', href: '/inbox', badge: pendingCount },
    { label: 'Candidates', href: '/candidates' },
    { label: 'Universe', href: '/universe' },
    { label: 'Weekly Review', href: '/weekly-review' },
    { label: 'Docs', href: '/docs' },
    { label: 'Settings', href: '/settings' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      ref={headerRef}
      className="mb-4 border-b border-neutral-200 pb-3 dark:border-neutral-800"
    >
      {/* Top bar — always visible */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-[#e6eaf0]">
          {title}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
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
        <nav className="mt-3 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150 ${
                  isActive
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

          {/* Logout at the bottom of the menu */}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition-all duration-150 hover:bg-red-50 dark:text-[#e27d7d] dark:hover:bg-[#3a2227]"
          >
            Logout
          </button>
        </nav>
      )}
    </header>
  )
}