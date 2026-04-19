'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/app/trading/lib/supabase'
import { createInvestingSupabaseBrowserClient } from '@/app/investing/lib/supabase'

export function GlobalLogoutButton() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  const supabase = useMemo(() => {
    if (pathname.startsWith('/investing')) {
      return createInvestingSupabaseBrowserClient()
    }
    return createSupabaseBrowserClient()
  }, [pathname])

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="ui-btn-secondary"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  )
}