'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createInvestingSupabaseBrowserClient } from '@/app/investing/lib/supabase'
import type { DecisionJournalEntry } from '@/app/investing/types'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { InlineStatusBanner } from '@/components/ui/InlineStatusBanner'
import { InvestingPageHeader } from '@/components/investing/InvestingPageHeader'
import { InvestingSearchToolbar } from '@/components/investing/InvestingSearchToolbar'
import { DecisionJournalForm } from '@/components/investing/DecisionJournalForm'
import { DecisionJournalTable } from '@/components/investing/DecisionJournalTable'
import { DecisionJournalCardList } from '@/components/investing/DecisionJournalCardList'

type DecisionJournalFormPayload = {
  entry_date: string
  ticker: string
  account: DecisionJournalEntry['account']
  action: DecisionJournalEntry['action']
  shares: number | null
  price: number | null
  portfolio_weight_after: number | null
  reasoning: string | null
  emotional_state: DecisionJournalEntry['emotional_state']
  scorecard_overall: number | null
  framework_supported: DecisionJournalEntry['framework_supported']
  three_month_review: string | null
  twelve_month_review: string | null
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(1)
}

function SkeletonCard() {
  return (
    <div className="ui-card p-4">
      <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
      </div>
    </div>
  )
}

function addMonths(dateString: string, months: number) {
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function toNullableNumber(value: string | null): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function buildPrefilledJournalEntry(searchParams: URLSearchParams): DecisionJournalEntry | null {
  const ticker = searchParams.get('ticker')?.trim().toUpperCase() ?? ''
  if (!ticker) return null

  const account =
    (searchParams.get('account')?.trim() as DecisionJournalEntry['account'] | null) ?? 'TFSA'
  const action =
    (searchParams.get('action')?.trim() as DecisionJournalEntry['action'] | null) ?? 'BUY'
  const entryDate = searchParams.get('entry_date')?.trim() ?? getTodayDateString()

  return {
    id: '',
    user_id: null,
    entry_number: 0,
    entry_date: entryDate,
    ticker,
    account,
    action,
    shares: toNullableNumber(searchParams.get('shares')),
    price: toNullableNumber(searchParams.get('price')),
    portfolio_weight_after: toNullableNumber(searchParams.get('portfolio_weight_after')),
    reasoning: searchParams.get('reasoning')?.trim() || null,
    emotional_state:
      (searchParams.get('emotional_state')?.trim() as DecisionJournalEntry['emotional_state'] | null) ??
      null,
    scorecard_overall: toNullableNumber(searchParams.get('scorecard_overall')),
    framework_supported:
      (searchParams.get('framework_supported')?.trim() as DecisionJournalEntry['framework_supported'] | null) ??
      null,
    three_month_review: searchParams.get('three_month_review')?.trim() || null,
    twelve_month_review: searchParams.get('twelve_month_review')?.trim() || null,
    review_due_3m: null,
    review_due_12m: null,
    created_at: '',
  }
}

function InvestingJournalPageContent() {
  const supabase = useMemo(() => createInvestingSupabaseBrowserClient(), [])
  const searchParams = useSearchParams()

  const queryMode = searchParams.get('mode')
  const queryPrefillEntry = useMemo(
    () => (queryMode === 'new' ? buildPrefilledJournalEntry(searchParams) : null),
    [queryMode, searchParams]
  )

  const [entries, setEntries] = useState<DecisionJournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [sheetOpen, setSheetOpen] = useState(
    () => queryMode === 'new' && !!buildPrefilledJournalEntry(searchParams)
  )
  const [editingEntry, setEditingEntry] = useState<DecisionJournalEntry | null>(
    () => (queryMode === 'new' ? buildPrefilledJournalEntry(searchParams) : null)
  )
  const [formBusy, setFormBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error: loadError } = await supabase
        .from('investing_decision_journal')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('entry_number', { ascending: false })

      if (cancelled) return

      if (loadError) {
        setError(loadError.message)
        setLoading(false)
        return
      }

      setEntries((data ?? []) as DecisionJournalEntry[])
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return entries

    return entries.filter((entry) => {
      return (
        entry.ticker.toLowerCase().includes(term) ||
        entry.action.toLowerCase().includes(term) ||
        entry.account.toLowerCase().includes(term) ||
        (entry.reasoning ?? '').toLowerCase().includes(term) ||
        (entry.emotional_state ?? '').toLowerCase().includes(term)
      )
    })
  }, [entries, search])

  const summary = useMemo(() => {
    const buys = entries.filter((entry) => entry.action === 'BUY').length
    const adds = entries.filter((entry) => entry.action === 'ADD').length
    const trims = entries.filter((entry) => entry.action === 'TRIM').length
    const sells = entries.filter((entry) => entry.action === 'SELL').length

    const scored = entries.filter((entry) => entry.scorecard_overall != null)
    const avgScore =
      scored.length > 0
        ? scored.reduce((sum, entry) => sum + Number(entry.scorecard_overall), 0) / scored.length
        : 0

    const today = new Date().toISOString().slice(0, 10)

    const pending3m = entries.filter(
      (entry) =>
        entry.review_due_3m != null &&
        entry.review_due_3m <= today &&
        !entry.three_month_review
    ).length

    const pending12m = entries.filter(
      (entry) =>
        entry.review_due_12m != null &&
        entry.review_due_12m <= today &&
        !entry.twelve_month_review
    ).length

    const upcoming3m = entries.filter(
      (entry) =>
        entry.review_due_3m != null &&
        entry.review_due_3m > today &&
        !entry.three_month_review
    ).length

    const upcoming12m = entries.filter(
      (entry) =>
        entry.review_due_12m != null &&
        entry.review_due_12m > today &&
        !entry.twelve_month_review
    ).length

    return {
      total: entries.length,
      buys,
      adds,
      trims,
      sells,
      avgScore,
      pending3m,
      pending12m,
      upcoming3m,
      upcoming12m,
    }
  }, [entries])

  const latestEntry = useMemo(() => entries[0] ?? null, [entries])

  function openAddSheet() {
    setSuccess(null)
    setEditingEntry(queryPrefillEntry)
    setSheetOpen(true)
  }

  function openEditSheet(entry: DecisionJournalEntry) {
    setSuccess(null)
    setEditingEntry(entry)
    setSheetOpen(true)
  }

  function closeSheet() {
    if (formBusy) return
    setSheetOpen(false)
    setEditingEntry(null)
  }

  async function handleSaveEntry(payload: DecisionJournalFormPayload) {
    setFormBusy(true)
    setError(null)
    setSuccess(null)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      setError(authError.message)
      setFormBusy(false)
      return
    }

    const reviewDue3m = addMonths(payload.entry_date, 3)
    const reviewDue12m = addMonths(payload.entry_date, 12)

    const nextEntryNumber =
      entries.length > 0
        ? Math.max(...entries.map((e) => e.entry_number)) + 1
        : 1

    const baseRecord = {
      user_id: user?.id ?? null,
      entry_date: payload.entry_date,
      ticker: payload.ticker,
      account: payload.account,
      action: payload.action,
      shares: payload.shares,
      price: payload.price,
      portfolio_weight_after: payload.portfolio_weight_after,
      reasoning: payload.reasoning,
      emotional_state: payload.emotional_state,
      scorecard_overall: payload.scorecard_overall,
      framework_supported: payload.framework_supported,
      three_month_review: payload.three_month_review,
      twelve_month_review: payload.twelve_month_review,
      review_due_3m: reviewDue3m,
      review_due_12m: reviewDue12m,
    }

    if (editingEntry && editingEntry.id) {
      const { error: updateError } = await supabase
        .from('investing_decision_journal')
        .update(baseRecord)
        .eq('id', editingEntry.id)

      if (updateError) {
        setError(updateError.message)
        setFormBusy(false)
        return
      }

      setEntries((prev) =>
        prev
          .map((entry) =>
            entry.id === editingEntry.id
              ? {
                  ...entry,
                  ...baseRecord,
                }
              : entry
          )
          .sort((a, b) => {
            const byDate = b.entry_date.localeCompare(a.entry_date)
            if (byDate !== 0) return byDate
            return b.entry_number - a.entry_number
          })
      )

      setSuccess(`Updated journal entry for ${payload.ticker}.`)
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('investing_decision_journal')
        .insert({ ...baseRecord, entry_number: nextEntryNumber })
        .select('*')
        .single()

      if (insertError) {
        setError(insertError.message)
        setFormBusy(false)
        return
      }

      setEntries((prev) =>
        [inserted as DecisionJournalEntry, ...prev].sort((a, b) => {
          const byDate = b.entry_date.localeCompare(a.entry_date)
          if (byDate !== 0) return byDate
          return b.entry_number - a.entry_number
        })
      )

      setSuccess(`Added journal entry for ${payload.ticker}.`)
    }

    setFormBusy(false)
    setSheetOpen(false)
    setEditingEntry(null)
  }

  async function handleDeleteEntry(entry: DecisionJournalEntry) {
    const confirmed = window.confirm(`Delete journal entry for ${entry.ticker}?`)
    if (!confirmed) return

    setDeletingId(entry.id)
    setError(null)
    setSuccess(null)

    const { error: deleteError } = await supabase
      .from('investing_decision_journal')
      .delete()
      .eq('id', entry.id)

    if (deleteError) {
      setError(deleteError.message)
      setDeletingId(null)
      return
    }

    setEntries((prev) => prev.filter((item) => item.id !== entry.id))
    setDeletingId(null)
    setSuccess(`Deleted journal entry for ${entry.ticker}.`)
  }

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Journal"
        subtitle="Review every buy, sell, add, trim, and hold decision with reasoning, emotion, and follow-up dates."
        actions={
          <button type="button" onClick={openAddSheet} className="ui-btn-primary">
            Add journal entry
          </button>
        }
      />

      <InlineStatusBanner tone="error" message={error} />
      <InlineStatusBanner tone="success" message={success} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <DataCard title="Journal Summary">
              <DataCardRow label="Total entries" value={String(summary.total)} />
              <DataCardRow label="BUY / ADD" value={`${summary.buys} / ${summary.adds}`} />
              <DataCardRow label="SELL / TRIM" value={`${summary.sells} / ${summary.trims}`} />
            </DataCard>

            <DataCard title="Decision Quality">
              <DataCardRow label="Average score" value={formatScore(summary.avgScore)} />
              <DataCardRow
                label="Reviews overdue"
                value={String(summary.pending3m + summary.pending12m)}
              />
              <DataCardRow
                label="Reviews upcoming"
                value={String(summary.upcoming3m + summary.upcoming12m)}
              />
            </DataCard>

            <DataCard title="Latest Entry">
              <DataCardRow label="Ticker" value={latestEntry?.ticker ?? '—'} />
              <DataCardRow label="Action" value={latestEntry?.action ?? '—'} />
              <DataCardRow label="Date" value={formatDate(latestEntry?.entry_date)} />
            </DataCard>

            <DataCard title="Latest Context">
              <DataCardRow label="Account" value={latestEntry?.account ?? '—'} />
              <DataCardRow label="Emotion" value={latestEntry?.emotional_state ?? '—'} />
              <DataCardRow
                label="Weight after"
                value={formatPercent(latestEntry?.portfolio_weight_after)}
              />
            </DataCard>
          </>
        )}
      </section>

      {!loading && entries.length > 0 ? (
        <InvestingSearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search ticker, action, account, reasoning, or emotion"
        />
      ) : null}

      <CollapsibleSection
        title="Recent journal entries"
        subtitle="Mobile-first card view of the most recent investing decisions."
        defaultOpen={true}
      >
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <DecisionJournalCardList
            entries={filteredEntries}
            onEdit={openEditSheet}
            onDelete={handleDeleteEntry}
            deletingId={deletingId}
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Journal table"
        subtitle="Search and scan the full journal history in a denser format."
        defaultOpen={false}
      >
        {loading ? (
          <SkeletonCard />
        ) : (
          <DecisionJournalTable
            entries={filteredEntries}
            onEdit={openEditSheet}
            onDelete={handleDeleteEntry}
            deletingId={deletingId}
          />
        )}
      </CollapsibleSection>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingEntry?.id ? `Edit ${editingEntry.ticker}` : 'Add journal entry'}
      >
        <DecisionJournalForm
          key={
            editingEntry?.id
              ? editingEntry.id
              : `new-journal-entry-${editingEntry?.ticker ?? 'blank'}`
          }
          initialEntry={editingEntry}
          onSubmit={handleSaveEntry}
          onCancel={closeSheet}
          submitLabel={editingEntry?.id ? 'Save changes' : 'Add journal entry'}
          busy={formBusy}
        />
      </BottomSheet>
    </div>
  )
}

export default function InvestingJournalPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <SkeletonCard />
        </div>
      }
    >
      <InvestingJournalPageContent />
    </Suspense>
  )
}