import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/app/trading/lib/supabase'

export function usePortfolioValue() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [portfolioValue, setPortfolioValue] = useState('100000')
  const hasLoadedSettings = useRef(false)
  const skipNextPortfolioSync = useRef(false)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: settingsRow, error: settingsError } = await supabase
          .from('user_settings')
          .select('portfolio_value')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (settingsError) {
          console.error('User settings load error:', settingsError)
        } else if (settingsRow?.portfolio_value != null) {
          skipNextPortfolioSync.current = true
          setPortfolioValue(String(settingsRow.portfolio_value))
        }
      }

      hasLoadedSettings.current = true
    }

    void load()
  }, [supabase])

  useEffect(() => {
    if (!hasLoadedSettings.current) return

    if (skipNextPortfolioSync.current) {
      skipNextPortfolioSync.current = false
      return
    }

    const parsedPortfolioValue = Number(portfolioValue)

    if (!Number.isFinite(parsedPortfolioValue) || parsedPortfolioValue <= 0) {
      return
    }

    const savePortfolioValue = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase.from('user_settings').upsert(
        {
          user_id: user.id,
          portfolio_value: parsedPortfolioValue,
        },
        { onConflict: 'user_id' }
      )

      if (error) {
        console.error('User settings save error:', error)
      }
    }

    void savePortfolioValue()
  }, [portfolioValue, supabase])

  return { portfolioValue, setPortfolioValue }
}