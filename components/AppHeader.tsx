'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

type Props = {
  title: string
}

export function AppHeader({ title }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [pendingCount, setPendingCount] = useState<number>(0)

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
    <header className="mb-4 border-b border-neutral-200 pb-3 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-[#e6eaf0]">
          {title}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="ui-btn-secondary"
          >
            Logout
          </button>
        </div>
      </div>
      <nav className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 ${isActive ? 'ui-link-pill-active' : 'ui-link-pill-idle'}`}
            >
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                {item.label}
                {'badge' in item && item.badge && item.badge > 0 ? (
                  <span className="ui-pill-neutral px-2 py-0.5 text-[11px]">
                    {item.badge}
                  </span>
                ) : null}
              </span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}