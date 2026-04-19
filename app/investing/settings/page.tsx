'use client'

import { useEffect, useMemo, useState } from 'react'
import { createInvestingSupabaseBrowserClient } from '@/app/investing/lib/supabase'
import { InvestingPageHeader } from '@/components/investing/InvestingPageHeader'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'


export default function InvestingSettingsPage() {
  const supabase = useMemo(() => createInvestingSupabaseBrowserClient(), [])

  const [defaultAccount, setDefaultAccount] = useState('TFSA')
  const [defaultCurrency, setDefaultCurrency] = useState('USD')
  const [macroMode, setMacroMode] = useState('Balanced')
  const [positionSizingMode, setPositionSizingMode] = useState('Manual review')
  const [notes, setNotes] = useState('')

  const [sectorTargetCount, setSectorTargetCount] = useState<number | null>(null)
  const [bucketTargetCount, setBucketTargetCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [sectorRes, bucketRes] = await Promise.all([
        supabase.from('investing_sector_targets').select('id', { count: 'exact', head: true }),
        supabase.from('investing_bucket_targets').select('id', { count: 'exact', head: true }),
      ])

      if (cancelled) return

      setSectorTargetCount(sectorRes.count ?? 0)
      setBucketTargetCount(bucketRes.count ?? 0)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  function handleSave() {
    alert('Placeholder only — settings persistence will be added next.')
  }

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Settings"
        subtitle="Configure investing defaults, workflow preferences, and reference settings."
        actions={
          <button type="button" onClick={handleSave} className="ui-btn-primary">
            Save settings
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DataCard title="Defaults">
          <DataCardRow label="Default account" value={defaultAccount} />
          <DataCardRow label="Base currency" value={defaultCurrency} />
          <DataCardRow label="Macro mode" value={macroMode} />
        </DataCard>

        <DataCard title="Workflow">
          <DataCardRow label="Position sizing" value={positionSizingMode} />
          <DataCardRow label="Journal reviews" value="Enabled" />
          <DataCardRow label="Watchlist workflow" value="Manual" />
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
          <DataCardRow label="Status" value="Placeholder — settings not yet persisted" />
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
              onChange={(e) => setDefaultAccount(e.target.value)}
              className="ui-select"
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
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="ui-select"
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
              onChange={(e) => setMacroMode(e.target.value)}
              className="ui-select"
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
              onChange={(e) => setPositionSizingMode(e.target.value)}
              className="ui-select"
            >
              <option value="Manual review">Manual review</option>
              <option value="Rules-based">Rules-based</option>
            </select>
          </label>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Notes"
        subtitle="Space for temporary operating preferences until persistence is wired up."
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
          />
        </label>
      </CollapsibleSection>
    </div>
  )
}