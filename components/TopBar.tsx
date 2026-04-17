'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { createSupabaseBrowserClient } from '@/lib/supabase'

function getModuleLabel(pathname: string) {
  if (pathname.startsWith('/trading')) return 'Divya'
  if (pathname.startsWith('/investing')) return 'Shayna'
  if (pathname.startsWith('/login')) return 'Login'
  return 'Home'
}

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [loggingOut, setLoggingOut] = useState(false)

  const moduleLabel = getModuleLabel(pathname)

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    setLoggingOut(false)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-neutral-800 dark:bg-[#111418]/90 dark:supports-[backdrop-filter]:bg-[#111418]/80">
      <div className="mx-auto flex h-[56px] max-w-screen-2xl items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        <div className="min-w-0">
          <Link
            href="/"
            className="block truncate text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-[#e6eaf0]"
          >
            Vyana
          </Link>
          <div className="text-xs text-neutral-500 dark:text-[#a8b2bf]">
            {moduleLabel}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="ui-btn-secondary hidden md:inline-flex"
          >
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}