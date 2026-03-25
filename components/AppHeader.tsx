'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'

type Props = {
  title: string
  subtitle?: string
}

export function AppHeader({ title, subtitle }: Props) {
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
    <header className="mb-10">
      <div className="rounded-3xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-neutral-500">
              Divya Swing Engine
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              {title}
            </h1>

            {subtitle ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={isActive ? 'ui-link-pill-active' : 'ui-link-pill-idle'}
                  >
                    <span className="inline-flex items-center gap-2">
                      {item.label}
                      {'badge' in item && item.badge && item.badge > 0 ? (
                        <span className="rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                          {item.badge}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                )
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="ui-btn-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}