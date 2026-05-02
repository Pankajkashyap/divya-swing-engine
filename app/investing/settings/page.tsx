'use client'

import { useEffect, useMemo, useState } from 'react'
import { createInvestingBrowserClient } from '@/app/investing/lib/supabaseBrowser'
import { InvestingPageHeader } from '@/components/investing/InvestingPageHeader'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { InlineStatusBanner } from '@/components/ui/InlineStatusBanner'

type InvestingUserSettings = {
  id: string
  user_id: string
  default_account: 'TFSA' | 'Non-registered'
  default_currency: 'USD' | 'CAD'
  macro_mode: 'Balanced' | 'Risk-on' | 'Risk-off'
  position_sizing_mode: 'Manual review' | 'Rules-based'
  notes: string | null
  strong_buy_min_score: number
  buy_min_score: number
  hold_min_score: number
  allow_strong_buy_with_warnings: boolean
  created_at: string
  updated_at: string
}

export default function InvestingSettingsPage() {
const supabase = useMemo(() => createInvestingBrowserClient(), [])

  const [defaultAccount, setDefaultAccount] = useState<'TFSA' | 'Non-registered'>('TFSA')
  const [defaultCurrency, setDefaultCurrency] = useState<'USD' | 'CAD'>('USD')
  const [macroMode, setMacroMode] = useState<'Balanced' | 'Risk-on' | 'Risk-off'>('Balanced')
  const [positionSizingMode, setPositionSizingMode] = useState<
    'Manual review' | 'Rules-based'
  >('Manual review')
  const [notes, setNotes] = useState('')

  const [strongBuyMinScore, setStrongBuyMinScore] = useState('8.5')
  const [buyMinScore, setBuyMinScore] = useState('7.0')
  const [holdMinScore, setHoldMinScore] = useState('5.0')
  const [allowStrongBuyWithWarnings, setAllowStrongBuyWithWarnings] = useState(true)

  const [sectorTargetCount, setSectorTargetCount] = useState<number | null>(null)
  const [bucketTargetCount, setBucketTargetCount] = useState<number | null>(null)

  const [settingsRow, setSettingsRow] = useState<InvestingUserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        if (!cancelled) {
          setError(userError.message)
          setLoading(false)
        }
        return
      }

      if (!user) {
        if (!cancelled) {
          setError('No authenticated user found.')
          setLoading(false)
        }
        return
      }

      const [settingsRes, sectorRes, bucketRes] = await Promise.all([
        supabase
          .from('investing_user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('investing_sector_targets').select('id', { count: 'exact', head: true }),
        supabase.from('investing_bucket_targets').select('id', { count: 'exact', head: true }),
      ])

      if (cancelled) return

      const errors: string[] = []

      if (settingsRes.error) {
        errors.push(`Settings: ${settingsRes.error.message}`)
      } else if (settingsRes.data) {
        const row = settingsRes.data as InvestingUserSettings
        setSettingsRow(row)
        setDefaultAccount(row.default_account)
        setDefaultCurrency(row.default_currency)
        setMacroMode(row.macro_mode)
        setPositionSizingMode(row.position_sizing_mode)
        setNotes(row.notes ?? '')
        setStrongBuyMinScore(String(row.strong_buy_min_score ?? 8.5))
        setBuyMinScore(String(row.buy_min_score ?? 7.0))
        setHoldMinScore(String(row.hold_min_score ?? 5.0))
        setAllowStrongBuyWithWarnings(row.allow_strong_buy_with_warnings ?? true)
      }

      if (sectorRes.error) {
        errors.push(`Sector targets: ${sectorRes.error.message}`)
      } else {
        setSectorTargetCount(sectorRes.count ?? 0)
      }

      if (bucketRes.error) {
        errors.push(`Bucket targets: ${bucketRes.error.message}`)
      } else {
        setBucketTargetCount(bucketRes.count ?? 0)
      }

      if (errors.length > 0) {
        setError(errors.join(' · '))
      }

      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      setError(userError.message)
      setSaving(false)
      return
    }

    if (!user) {
      setError('No authenticated user found.')
      setSaving(false)
      return
    }

    const strongBuy = Number(strongBuyMinScore)
    const buy = Number(buyMinScore)
    const hold = Number(holdMinScore)

    if (
      !Number.isFinite(strongBuy) ||
      !Number.isFinite(buy) ||
      !Number.isFinite(hold)
    ) {
      setError('Verdict thresholds must be valid numbers.')
      setSaving(false)
      return
    }

    if (!(strongBuy >= buy && buy >= hold)) {
      setError('Verdict thresholds must follow Strong Buy >= Buy >= Hold.')
      setSaving(false)
      return
    }

    const record = {
      user_id: user.id,
      default_account: defaultAccount,
      default_currency: defaultCurrency,
      macro_mode: macroMode,
      position_sizing_mode: positionSizingMode,
      notes: notes.trim() || null,
      strong_buy_min_score: strongBuy,
      buy_min_score: buy,
      hold_min_score: hold,
      allow_strong_buy_with_warnings: allowStrongBuyWithWarnings,
    }

    const { data, error: saveError } = await supabase
      .from('investing_user_settings')
      .upsert(record, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
      return
    }

    setSettingsRow(data as InvestingUserSettings)
    setSuccess('Settings saved.')
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Settings"
        subtitle="Configure investing defaults, workflow preferences, and reference settings."
        actions={
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="ui-btn-primary"
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        }
      />

      <InlineStatusBanner tone="error" message={error} />
      <InlineStatusBanner tone="success" message={success} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DataCard title="Defaults">
          <DataCardRow label="Default account" value={loading ? '...' : defaultAccount} />
          <DataCardRow label="Base currency" value={loading ? '...' : defaultCurrency} />
          <DataCardRow label="Macro mode" value={loading ? '...' : macroMode} />
        </DataCard>

        <DataCard title="Workflow">
          <DataCardRow
            label="Position sizing"
            value={loading ? '...' : positionSizingMode}
          />
          <DataCardRow label="Journal reviews" value="Enabled" />
          <DataCardRow label="Watchlist workflow" value="Manual" />
          <DataCardRow
            label="Verdict thresholds"
            value={loading ? '...' : `SB ${strongBuyMinScore} · B ${buyMinScore} · H ${holdMinScore}`}
          />
        </DataCard>

        <DataCard title="Targets Configured">
          <DataCardRow
            label="Sector targets"
            value={sectorTargetCount == null ? '...' : String(sectorTargetCount)}
          />
          <DataCardRow
            label="Bucket targets"
            value={bucketTargetCount == null ? '...' : String(bucketTargetCount)}
          />
          <DataCardRow
            label="Status"
            value={settingsRow ? 'Persisted' : loading ? '...' : 'Using defaults'}
          />
        </DataCard>
      </section>

      <CollapsibleSection
        title="General preferences"
        subtitle="Core defaults used across holdings, analysis, and review flows."
        defaultOpen={true}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Default account
            </span>
            <select
              value={defaultAccount}
              onChange={(e) =>
                setDefaultAccount(e.target.value as 'TFSA' | 'Non-registered')
              }
              className="ui-select"
              disabled={loading}
            >
              <option value="TFSA">TFSA</option>
              <option value="Non-registered">Non-registered</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Base currency
            </span>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value as 'USD' | 'CAD')}
              className="ui-select"
              disabled={loading}
            >
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Macro mode
            </span>
            <select
              value={macroMode}
              onChange={(e) =>
                setMacroMode(e.target.value as 'Balanced' | 'Risk-on' | 'Risk-off')
              }
              className="ui-select"
              disabled={loading}
            >
              <option value="Balanced">Balanced</option>
              <option value="Risk-on">Risk-on</option>
              <option value="Risk-off">Risk-off</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Position sizing mode
            </span>
            <select
              value={positionSizingMode}
              onChange={(e) =>
                setPositionSizingMode(
                  e.target.value as 'Manual review' | 'Rules-based'
                )
              }
              className="ui-select"
              disabled={loading}
            >
              <option value="Manual review">Manual review</option>
              <option value="Rules-based">Rules-based</option>
            </select>
          </label>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Verdict thresholds"
        subtitle="Control how quantitative scores map to Strong Buy, Buy, Hold, and Avoid."
        defaultOpen={false}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Strong Buy minimum score
            </span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={strongBuyMinScore}
              onChange={(e) => setStrongBuyMinScore(e.target.value)}
              className="ui-input"
              disabled={loading}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Buy minimum score
            </span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={buyMinScore}
              onChange={(e) => setBuyMinScore(e.target.value)}
              className="ui-input"
              disabled={loading}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
              Hold minimum score
            </span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={holdMinScore}
              onChange={(e) => setHoldMinScore(e.target.value)}
              className="ui-input"
              disabled={loading}
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <input
              type="checkbox"
              checked={allowStrongBuyWithWarnings}
              onChange={(e) => setAllowStrongBuyWithWarnings(e.target.checked)}
              disabled={loading}
            />
            <span className="text-sm text-neutral-900 dark:text-[#e6eaf0]">
              Allow Strong Buy when only warning red flags exist
            </span>
          </label>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Notes"
        subtitle="Operating preferences and reminders for your investing workflow."
        defaultOpen={false}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            Internal notes
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="ui-textarea min-h-32"
            placeholder="Example: keep higher cash when macro breadth is weakening."
            disabled={loading}
          />
        </label>
      </CollapsibleSection>
    </div>
  )
}