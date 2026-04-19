'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/app/trading/lib/supabase'
import { createInvestingSupabaseBrowserClient } from '@/app/investing/lib/supabase'

export function GlobalLogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const tradingSupabase = useMemo(() => createSupabaseBrowserClient(), [])
  const investingSupabase = useMemo(() => createInvestingSupabaseBrowserClient(), [])

  const handleLogout = async () => {
    setLoading(true)

    await Promise.allSettled([
      tradingSupabase.auth.signOut(),
      investingSupabase.auth.signOut(),
    ])

    router.push('/login')
    router.refresh()
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