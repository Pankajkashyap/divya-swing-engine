'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { AppHeader } from '@/app/trading/components/AppHeader'
import { Tooltip } from '@/components/ui/Tooltip'
import { createSupabaseBrowserClient } from '@/app/trading/lib/supabase'

type UserSettings = {
  id: string
  user_id: string
  portfolio_value: number
  timezone: string
  email_notifications_enabled: boolean
  digest_email_enabled: boolean
  urgent_alerts_enabled: boolean
  notification_email: string | null
  scan_schedule: 'evening_only' | 'three_times_daily'
  buy_signal_expiry_days: 1 | 2 | 3
  morning_trade_monitor_enabled: boolean
  created_at: string
  updated_at: string
  screener_enabled: boolean
  screener_min_price: number
  screener_min_avg_volume: number
  screener_min_eps_growth_pct: number
  screener_min_revenue_growth_pct: number
  screener_exchanges: string
  screener_max_candidates: number
}

const timezoneOptions = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
]

const scanScheduleOptions = [
  {
    value: 'evening_only' as const,
    label: 'Evening only',
    description:
      'Watchlist scans run at 4:30 PM ET after market close. Review signals at night and place orders before market open.',
  },
  {
    value: 'three_times_daily' as const,
    label: 'Three times daily',
    description:
      'Watchlist scans run at 8:30 AM, 12:30 PM, and 4:30 PM ET. Signals may arrive during market hours.',
  },
]

const defaultTimezone = 'America/Denver'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function formatMemberSince(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41M2 12h2M20 12h2 M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SystemIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="ui-card px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            {label}
          </div>
          <p className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            {description}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
            value ? 'bg-neutral-900 dark:bg-neutral-100' : 'bg-neutral-300 dark:bg-[#39414d]',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform dark:bg-neutral-900',
              value ? 'translate-x-6' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      </div>
    </div>
  )
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="ui-section">
      <div className="border-b border-neutral-200 px-6 py-5 dark:border-[#2a313b]">
        <h2 className="ui-heading-2">{title}</h2>
        {description ? (
          <p className="mt-2 ui-muted">{description}</p>
        ) : null}
      </div>
      <div className="space-y-6 px-6 py-6">{children}</div>
    </section>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const { theme, setTheme } = useTheme()

  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accountEmail, setAccountEmail] = useState<string>('—')
  const [portfolioValue, setPortfolioValue] = useState('')
  const [timezone, setTimezone] = useState(defaultTimezone)
  const [notificationEmail, setNotificationEmail] = useState('')
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true)
  const [digestEmailEnabled, setDigestEmailEnabled] = useState(true)
  const [urgentAlertsEnabled, setUrgentAlertsEnabled] = useState(true)
  const [scanSchedule, setScanSchedule] = useState<'evening_only' | 'three_times_daily'>('evening_only')
  const [buySignalExpiryDays, setBuySignalExpiryDays] = useState<1 | 2 | 3>(1)
  const [morningTradeMonitorEnabled, setMorningTradeMonitorEnabled] = useState(true)
  const [portfolioValueError, setPortfolioValueError] = useState<string | null>(null)
  const [notificationEmailError, setNotificationEmailError] = useState<string | null>(null)
  const [screenerEnabled, setScreenerEnabled] = useState(false)
  const [screenerMinPrice, setScreenerMinPrice] = useState('10')
  const [screenerMinAvgVolume, setScreenerMinAvgVolume] = useState('500000')
  const [screenerMinEpsGrowthPct, setScreenerMinEpsGrowthPct] = useState('25')
  const [screenerMinRevenueGrowthPct, setScreenerMinRevenueGrowthPct] = useState('20')
  const [screenerExchanges, setScreenerExchanges] = useState('XNAS,XNYS')
  const [screenerMaxCandidates, setScreenerMaxCandidates] = useState<10 | 20 | 30>(20)
  const [consecutiveStopOuts, setConsecutiveStopOuts] = useState<number>(0)

  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (authError || !user) {
        setError(authError?.message ?? 'Unable to load your account.')
        setLoading(false)
        return
      }

      setAccountEmail(user.email ?? '—')

      const { data, error: settingsError } = await supabase
        .from('user_settings')
        .select('*, consecutive_stop_outs')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (settingsError) {
        setError(settingsError.message)
        setLoading(false)
        return
      }

      const nextSettings = (data as UserSettings | null) ?? null

      setSettings(nextSettings)
      setPortfolioValue(
        nextSettings?.portfolio_value != null ? String(nextSettings.portfolio_value) : ''
      )
      setTimezone(nextSettings?.timezone ?? defaultTimezone)
      setNotificationEmail(nextSettings?.notification_email ?? (user.email ?? ''))
      setEmailNotificationsEnabled(nextSettings?.email_notifications_enabled ?? true)
      setDigestEmailEnabled(nextSettings?.digest_email_enabled ?? true)
      setUrgentAlertsEnabled(nextSettings?.urgent_alerts_enabled ?? true)
      setScanSchedule(nextSettings?.scan_schedule ?? 'evening_only')
      setBuySignalExpiryDays((nextSettings?.buy_signal_expiry_days ?? 1) as 1 | 2 | 3)
      setMorningTradeMonitorEnabled(nextSettings?.morning_trade_monitor_enabled ?? true)
      setScreenerEnabled(nextSettings?.screener_enabled ?? false)
      setScreenerMinPrice(String(nextSettings?.screener_min_price ?? 10))
      setScreenerMinAvgVolume(String(nextSettings?.screener_min_avg_volume ?? 500000))
      setScreenerMinEpsGrowthPct(String(nextSettings?.screener_min_eps_growth_pct ?? 25))
      setScreenerMinRevenueGrowthPct(String(nextSettings?.screener_min_revenue_growth_pct ?? 20))
      setScreenerExchanges(nextSettings?.screener_exchanges ?? 'XNAS,XNYS')
      setScreenerMaxCandidates((nextSettings?.screener_max_candidates ?? 20) as 10 | 20 | 30)
      setConsecutiveStopOuts(Number(data?.consecutive_stop_outs ?? 0))
      setLoading(false)
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [supabase])

  useEffect(() => {
    if (!saveSuccess) return

    const timeout = window.setTimeout(() => {
      setSaveSuccess(false)
    }, 3000)

    return () => window.clearTimeout(timeout)
  }, [saveSuccess])

  const handleSave = async () => {
    setError(null)
    setSaveSuccess(false)
    setPortfolioValueError(null)
    setNotificationEmailError(null)

    const trimmedPortfolioValue = portfolioValue.trim()
    const parsedPortfolioValue = Number(trimmedPortfolioValue)
    const trimmedNotificationEmail = notificationEmail.trim()

    let hasValidationError = false

    if (
      trimmedPortfolioValue.length === 0 ||
      Number.isNaN(parsedPortfolioValue) ||
      parsedPortfolioValue <= 0
    ) {
      setPortfolioValueError('Portfolio value must be a positive number.')
      hasValidationError = true
    }

    if (trimmedNotificationEmail && !isValidEmail(trimmedNotificationEmail)) {
      setNotificationEmailError('Enter a valid email address.')
      hasValidationError = true
    }

    if (hasValidationError) return

    setSaving(true)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      setError(authError?.message ?? 'Unable to load your account.')
      setSaving(false)
      return
    }

    const { error: saveError } = await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        portfolio_value: parsedPortfolioValue,
        timezone,
        notification_email: trimmedNotificationEmail || null,
        email_notifications_enabled: emailNotificationsEnabled,
        digest_email_enabled: digestEmailEnabled,
        urgent_alerts_enabled: urgentAlertsEnabled,
        scan_schedule: scanSchedule,
        buy_signal_expiry_days: buySignalExpiryDays,
        morning_trade_monitor_enabled: morningTradeMonitorEnabled,
        screener_enabled: screenerEnabled,
        screener_min_price: Number(screenerMinPrice),
        screener_min_avg_volume: Number(screenerMinAvgVolume),
        screener_min_eps_growth_pct: Number(screenerMinEpsGrowthPct),
        screener_min_revenue_growth_pct: Number(screenerMinRevenueGrowthPct),
        screener_exchanges: screenerExchanges,
        screener_max_candidates: screenerMaxCandidates,
      },
      { onConflict: 'user_id' }
    )

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    const { data: refreshedSettings, error: refreshError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (refreshError) {
      setError(refreshError.message)
      setSaving(false)
      return
    }

    setSettings((refreshedSettings as UserSettings | null) ?? null)
    setSaveSuccess(true)
    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleResetStreak = async () => {
    const { error } = await supabase
      .from('user_settings')
      .update({ consecutive_stop_outs: 0 })
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')

    if (error) {
      console.error('Reset streak error:', error)
      alert('Failed to reset streak counter')
      return
    }

    setConsecutiveStopOuts(0)
  }

  return (
    <main className="ui-page">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Settings"
        />

        {loading ? (
          <div className="space-y-6">
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-[#20262e]" />
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-[#20262e]" />
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-[#20262e]" />
          </div>
        ) : (
          <div className="space-y-6">
            <SectionShell title="Appearance" description="Choose how Divya Swing Engine looks.">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { value: 'light', label: 'Light', icon: <SunIcon /> },
                  { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
                  { value: 'system', label: 'System', icon: <SystemIcon /> },
                ].map((option) => {
                  const selected = theme === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      className={[
                        'ui-card w-full p-4 text-left transition-colors',
                        selected
                          ? 'border-2 border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-[#20262e]'
                          : '',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={[
                            'mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border',
                            selected
                              ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                              : 'border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-[#2a313b] dark:bg-[#181d23] dark:text-[#a8b2bf]',
                          ].join(' ')}
                        >
                          {option.icon}
                        </span>

                        <div>
                          <div className="text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                            {option.label}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </SectionShell>

            <SectionShell title="Portfolio">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Portfolio Value ($)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="ui-input"
                  placeholder="100000"
                  value={portfolioValue}
                  onChange={(event) => {
                    setPortfolioValue(event.target.value)
                    if (portfolioValueError) setPortfolioValueError(null)
                  }}
                />
              </label>

              {portfolioValueError ? (
                <p className="text-sm text-red-600 dark:text-[#f0a3a3]">{portfolioValueError}</p>
              ) : null}
            </SectionShell>

            <SectionShell title="Notifications">
              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                    Notification Email
                  </span>
                  <input
                    type="email"
                    className="ui-input"
                    placeholder="you@example.com"
                    value={notificationEmail}
                    onChange={(event) => {
                      setNotificationEmail(event.target.value)
                      if (notificationEmailError) setNotificationEmailError(null)
                    }}
                  />
                </label>

                <p className="mt-2 ui-muted">
                  Buy signals, stop alerts, and digests are sent to this address.
                </p>

                {notificationEmailError ? (
                  <p className="mt-2 text-sm text-red-600 dark:text-[#f0a3a3]">
                    {notificationEmailError}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                    Timezone
                  </span>
                  <select
                    className="ui-select"
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                  >
                    {timezoneOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-3">
                <ToggleRow
                  label="Email notifications"
                  description="Receive buy signal and alert emails"
                  value={emailNotificationsEnabled}
                  onChange={setEmailNotificationsEnabled}
                />

                <ToggleRow
                  label="Digest emails"
                  description="Receive daily and weekly summary emails"
                  value={digestEmailEnabled}
                  onChange={setDigestEmailEnabled}
                />

                <ToggleRow
                  label="Urgent alerts"
                  description="Receive urgent stop and target alert emails"
                  value={urgentAlertsEnabled}
                  onChange={setUrgentAlertsEnabled}
                />
              </div>
            </SectionShell>

            <SectionShell
              title="Workflow preferences"
              description="Control when the system scans for setups and how long signals stay active."
            >
              <div>
                <div className="flex items-center gap-1 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Scan schedule
                  <Tooltip text="How often the system scans your watchlist for buy signals. Evening only is recommended for swing traders who review signals at night." />
                </div>
                <p className="mt-1 ui-muted">
                  Evening only is recommended for swing traders who review signals at night and place pre-market orders.
                </p>

                <div className="mt-4 space-y-3">
                  {scanScheduleOptions.map((option) => {
                    const selected = scanSchedule === option.value

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setScanSchedule(option.value)}
                        className={[
                          'ui-card w-full cursor-pointer p-4 text-left',
                          selected
                            ? 'border-2 border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-[#20262e]'
                            : '',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={[
                              'mt-1 inline-flex h-4 w-4 shrink-0 rounded-full border',
                              selected
                                ? 'border-neutral-900 bg-neutral-900 dark:border-neutral-100 dark:bg-neutral-100'
                                : 'border-neutral-300 bg-white dark:border-[#4a5564] dark:bg-[#181d23]',
                            ].join(' ')}
                          >
                            {selected ? (
                              <span className="m-auto h-2 w-2 rounded-full bg-white dark:bg-neutral-900" />
                            ) : null}
                          </span>

                          <div>
                            <div className="text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                              {option.label}
                            </div>
                            <p className="mt-1 ui-muted">{option.description}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Buy signal active for
                  <Tooltip text="How many trading days a buy signal stays in your Inbox before it expires." />
                </div>
                <p className="mt-1 ui-muted">
                  How many trading days a buy signal stays in your Inbox before it expires.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  {[1, 2, 3].map((days) => {
                    const selected = buySignalExpiryDays === days

                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setBuySignalExpiryDays(days as 1 | 2 | 3)}
                        className={
                          selected
                            ? 'rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900'
                            : 'rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-[#2a313b] dark:text-[#c7d0db]'
                        }
                      >
                        {days} day{days > 1 ? 's' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>

              <ToggleRow
                label="Morning trade monitor"
                description="Check open trades at market open for stop hits at the open."
                value={morningTradeMonitorEnabled}
                onChange={setMorningTradeMonitorEnabled}
              />
            </SectionShell>

            <SectionShell
              title="Screener"
              description="The screener runs nightly and automatically discovers stock candidates using market data."
            >
              <ToggleRow
                label="Autonomous screener"
                description="Automatically discover new candidates each night based on your criteria below."
                value={screenerEnabled}
                onChange={setScreenerEnabled}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 flex items-center gap-1 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                    Minimum price ($)
                    <Tooltip text="Only consider stocks trading above this price." />
                  </span>
                  <input
                    type="number"
                    step="1"
                    className="ui-input"
                    value={screenerMinPrice}
                    onChange={(event) => setScreenerMinPrice(event.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-1 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                    Minimum average volume
                    <Tooltip text="Only consider stocks with at least this many shares traded per day on average." />
                  </span>
                  <input
                    type="number"
                    step="10000"
                    placeholder="500000"
                    className="ui-input"
                    value={screenerMinAvgVolume}
                    onChange={(event) => setScreenerMinAvgVolume(event.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-1 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                    Minimum EPS growth (%)
                    <Tooltip text="Only consider stocks with at least this level of earnings growth year over year." />
                  </span>
                  <input
                    type="number"
                    step="1"
                    placeholder="25"
                    className="ui-input"
                    value={screenerMinEpsGrowthPct}
                    onChange={(event) => setScreenerMinEpsGrowthPct(event.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-1 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                    Minimum revenue growth (%)
                    <Tooltip text="Only consider stocks with at least this level of sales growth year over year." />
                  </span>
                  <input
                    type="number"
                    step="1"
                    placeholder="20"
                    className="ui-input"
                    value={screenerMinRevenueGrowthPct}
                    onChange={(event) => setScreenerMinRevenueGrowthPct(event.target.value)}
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center gap-1 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  Max new candidates per night
                  <Tooltip text="The maximum number of new stocks the screener will add in a single night." />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {[10, 20, 30].map((count) => {
                    const selected = screenerMaxCandidates === count

                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setScreenerMaxCandidates(count as 10 | 20 | 30)}
                        className={
                          selected
                            ? 'rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900'
                            : 'rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 dark:border-[#2a313b] dark:text-[#c7d0db]'
                        }
                      >
                        {count}
                      </button>
                    )
                  })}
                </div>
              </div>
            </SectionShell>

            <SectionShell title="Losing Streak Counter">
              <div className="flex items-center gap-1 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                Losing Streak Counter
                <Tooltip text="Tracks consecutive stop-outs. Resets automatically when a target is hit. At 3 stop-outs a Soft Pause alert fires. At 4 a Hard Pause fires. At 5 a Full Stop fires." />
              </div>

              <div className="ui-card p-6">
                <div
                  className={[
                    'text-4xl font-semibold',
                    consecutiveStopOuts <= 2
                      ? 'text-green-600 dark:text-[#8fd0ab]'
                      : consecutiveStopOuts === 3
                        ? 'text-amber-600 dark:text-[#f3c27a]'
                        : 'text-red-600 dark:text-[#f0a3a3]',
                  ].join(' ')}
                >
                  {consecutiveStopOuts}
                </div>
                <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                  consecutive stop-outs
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleResetStreak}
                    className="ui-btn-primary"
                  >
                    Reset Counter
                  </button>
                </div>

                <p className="mt-3 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                  The counter resets automatically when a target alert is hit. Use this button only if you are manually resuming after a pause.
                </p>
              </div>
            </SectionShell>

            <SectionShell title="Account">
              <div>
                <div className="text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
                  Email address
                </div>
                <div className="mt-1 text-sm text-neutral-900 dark:text-[#e6eaf0]">
                  {accountEmail}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
                  Member since
                </div>
                <div className="mt-1 text-sm text-neutral-900 dark:text-[#e6eaf0]">
                  {formatMemberSince(settings?.created_at)}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="ui-btn-secondary"
                >
                  Sign out
                </button>
              </div>
            </SectionShell>

            <div className="flex flex-col gap-3">
              <div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="ui-btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

              {saveSuccess ? (
                <p className="text-sm text-green-600 dark:text-[#8fd0ab]">
                  Settings saved successfully.
                </p>
              ) : null}

              {error ? (
                <p className="text-sm text-red-600 dark:text-[#f0a3a3]">{error}</p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}