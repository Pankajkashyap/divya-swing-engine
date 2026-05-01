'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { WatchlistItem } from '@/app/investing/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { InlineStatusBanner } from '@/components/ui/InlineStatusBanner'
import { InvestingPageHeader } from '@/components/investing/InvestingPageHeader'
import { WatchlistForm } from '@/components/investing/WatchlistForm'

type EnrichedWatchlistItem = WatchlistItem

type WatchlistFormPayload = {
  ticker: string
  company: string
  sector: WatchlistItem['sector']
  why_watching: string | null
  target_entry: number | null
  current_price: number
  fair_value_low: number | null
  fair_value_high: number | null
  scorecard_overall: number | null
  status: WatchlistItem['status']
  date_added: string
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function toNullableNumber(value: string | null): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function buildPrefilledWatchlistItem(searchParams: URLSearchParams): EnrichedWatchlistItem | null {
  const ticker = searchParams.get('ticker')?.trim().toUpperCase() ?? ''
  if (!ticker) return null

  const company = searchParams.get('company')?.trim() ?? ticker
  const sectorParam = searchParams.get('sector')?.trim()
  const statusParam = searchParams.get('status')?.trim() as WatchlistItem['status'] | null
  const whyWatching = searchParams.get('why_watching')?.trim()
  const targetEntry = toNullableNumber(searchParams.get('target_entry'))
  const currentPrice = toNullableNumber(searchParams.get('current_price')) ?? 0
  const fairValueLow = toNullableNumber(searchParams.get('fair_value_low'))
  const fairValueHigh = toNullableNumber(searchParams.get('fair_value_high'))
  const scorecardOverall = toNullableNumber(searchParams.get('scorecard_overall'))

  return {
    id: '',
    user_id: null,
    ticker,
    company,
    sector: (sectorParam as WatchlistItem['sector']) ?? 'Technology',
    why_watching: whyWatching || null,
    target_entry: targetEntry,
    current_price: currentPrice,
    fair_value_low: fairValueLow,
    fair_value_high: fairValueHigh,
    scorecard_overall: scorecardOverall,
    status: statusParam ?? 'Under research',
    date_added: getTodayDateString(),
    discount_to_entry:
      targetEntry != null && targetEntry > 0
        ? ((targetEntry - currentPrice) / targetEntry) * 100
        : null,
    created_at: '',
    updated_at: '',
  }
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

function statusBadgeClass(status: WatchlistItem['status']) {
  if (status === 'Ready to buy') {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  }
  if (status === 'Watching — approaching entry') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  }
  if (status === 'Watching — overvalued') {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  }
  if (status === 'Removed') {
    return 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
  }
  return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
}

function buildResearchHref(item: EnrichedWatchlistItem) {
  const params = new URLSearchParams()
  params.set('mode', 'new')
  params.set('ticker', item.ticker)
  params.set('company', item.company)
  params.set('sector', item.sector)
  if (item.current_price > 0) params.set('current_price', String(item.current_price))
  if (item.fair_value_low != null) params.set('fair_value_low', String(item.fair_value_low))
  if (item.fair_value_high != null) params.set('fair_value_high', String(item.fair_value_high))
  if (item.scorecard_overall != null) params.set('scorecard_overall', String(item.scorecard_overall))
  if (item.why_watching?.trim()) params.set('thesis', item.why_watching.trim())
  return `/investing/research?${params.toString()}`
}

function InvestingWatchlistPageContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const queryMode = searchParams.get('mode')
  const queryPrefillItem = useMemo(
    () => (queryMode === 'new' ? buildPrefilledWatchlistItem(searchParams) : null),
    [queryMode, searchParams]
  )

  const [items, setItems] = useState<EnrichedWatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'research'>(
    () => (searchParams.get('filter') as 'all' | 'ready' | 'research' | null) ?? 'all'
  )

  const [sheetOpen, setSheetOpen] = useState(
    () => queryMode === 'new' && !!buildPrefilledWatchlistItem(searchParams)
  )
  const [editingItem, setEditingItem] = useState<EnrichedWatchlistItem | null>(
    () => (queryMode === 'new' ? buildPrefilledWatchlistItem(searchParams) : null)
  )
  const [formBusy, setFormBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (search.trim()) {
      params.set('q', search.trim())
    } else {
      params.delete('q')
    }

    if (activeFilter !== 'all') {
      params.set('filter', activeFilter)
    } else {
      params.delete('filter')
    }

    const next = params.toString()
    const current = searchParams.toString()

    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
    }
  }, [search, activeFilter, pathname, router, searchParams])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error: watchlistError } = await supabase
        .from('investing_watchlist')
        .select('*')
        .order('date_added', { ascending: false })

      if (cancelled) return

      if (watchlistError) {
        setError(watchlistError.message)
        setLoading(false)
        return
      }

      setItems((data ?? []) as EnrichedWatchlistItem[])
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const watchlist = useMemo(() => items.filter((w) => w.status !== 'Removed'), [items])

  const filteredWatchlist = useMemo(() => {
    let result = [...watchlist]

    if (search.trim()) {
      const term = search.toLowerCase()
      result = result.filter(
        (w) =>
          w.ticker.toLowerCase().includes(term) ||
          (w.company ?? '').toLowerCase().includes(term)
      )
    }

    if (activeFilter === 'ready') {
      result = result.filter((w) => w.status === 'Ready to buy')
    } else if (activeFilter === 'research') {
      result = result.filter((w) => w.status === 'Under research')
    }

    return result
  }, [watchlist, search, activeFilter])

  const bestValueGap = useMemo(() => {
    return [...watchlist]
      .filter((w) => w.discount_to_entry != null)
      .sort((a, b) => (b.discount_to_entry ?? 0) - (a.discount_to_entry ?? 0))[0]
  }, [watchlist])

  function handleAddNew() {
    setSuccess(null)
    setEditingItem(queryPrefillItem)
    setSheetOpen(true)
  }

  function openEditSheet(item: EnrichedWatchlistItem) {
    setSuccess(null)
    setEditingItem(item)
    setSheetOpen(true)
  }

  function closeSheet() {
    if (formBusy) return
    setSheetOpen(false)
    setEditingItem(null)
  }

  async function handleSaveItem(payload: WatchlistFormPayload) {
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

    const discountToEntry =
      payload.target_entry != null && payload.target_entry > 0
        ? ((payload.target_entry - payload.current_price) / payload.target_entry) * 100
        : null

    const record = {
      user_id: user?.id ?? null,
      ticker: payload.ticker,
      company: payload.company,
      sector: payload.sector,
      why_watching: payload.why_watching,
      target_entry: payload.target_entry,
      current_price: payload.current_price,
      fair_value_low: payload.fair_value_low,
      fair_value_high: payload.fair_value_high,
      scorecard_overall: payload.scorecard_overall,
      status: payload.status,
      date_added: payload.date_added,
      discount_to_entry: discountToEntry,
    }

    if (editingItem && editingItem.id) {
      const { error: updateError } = await supabase
        .from('investing_watchlist')
        .update(record)
        .eq('id', editingItem.id)

      if (updateError) {
        setError(updateError.message)
        setFormBusy(false)
        return
      }

      setItems((prev) =>
        prev
          .map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  ...record,
                }
              : item
          )
          .sort((a, b) => b.date_added.localeCompare(a.date_added))
      )

      setSuccess(`Updated ${payload.ticker} watchlist item.`)
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('investing_watchlist')
        .insert(record)
        .select('*')
        .single()

      if (insertError) {
        setError(insertError.message)
        setFormBusy(false)
        return
      }

      setItems((prev) =>
        [inserted as EnrichedWatchlistItem, ...prev].sort((a, b) =>
          b.date_added.localeCompare(a.date_added)
        )
      )

      setSuccess(`Added ${payload.ticker} to watchlist.`)
    }

    setFormBusy(false)
    setSheetOpen(false)
    setEditingItem(null)
  }

  async function handleDeleteItem(item: EnrichedWatchlistItem) {
    const confirmed = window.confirm(`Delete ${item.ticker} from the watchlist?`)
    if (!confirmed) return

    setDeletingId(item.id)
    setError(null)
    setSuccess(null)

    const { error: deleteError } = await supabase
      .from('investing_watchlist')
      .delete()
      .eq('id', item.id)

    if (deleteError) {
      setError(deleteError.message)
      setDeletingId(null)
      return
    }

    setItems((prev) => prev.filter((row) => row.id !== item.id))
    setDeletingId(null)
    setSuccess(`Deleted ${item.ticker} from watchlist.`)
  }

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Watchlist"
        subtitle="Track entry targets and wait for the right setup."
        actions={
          <button type="button" onClick={handleAddNew} className="ui-btn-primary">
            Add to watchlist
          </button>
        }
      />

      <InlineStatusBanner tone="error" message={error} />
      <InlineStatusBanner tone="success" message={success} />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : watchlist.length === 0 ? (
        <div className="ui-card p-6 text-center">
          <div className="mb-2 text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            Your watchlist is empty
          </div>
          <div className="mb-4 text-sm text-neutral-500 dark:text-[#a8b2bf]">
            Research a stock and click &quot;→ Watchlist&quot; to start tracking entry opportunities.
          </div>
          <Link href="/investing/research" className="ui-btn-primary">
            Find a stock
          </Link>
        </div>
      ) : watchlist.length <= 2 ? (
        <div className="mb-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
          {watchlist.length} stock{watchlist.length !== 1 ? 's' : ''} on your watchlist
        </div>
      ) : (
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div className="ui-card p-4">
            <div className="mb-2 text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Watchlist Summary
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-[#a8b2bf]">Total names</span>
                <span>{watchlist.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-[#a8b2bf]">Ready to buy</span>
                <span className="text-green-500">
                  {watchlist.filter((w) => w.status === 'Ready to buy').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-[#a8b2bf]">Approaching entry</span>
                <span className="text-blue-500">
                  {
                    watchlist.filter(
                      (w) => w.status === 'Watching — approaching entry'
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>

          {watchlist.some((w) => w.target_entry != null && w.target_entry > 0) && (
            <div className="ui-card p-4">
              <div className="mb-2 text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Best Value Gap
              </div>
              {!bestValueGap ? (
                <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">
                  No targets set yet
                </div>
              ) : (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-[#a8b2bf]">Ticker</span>
                    <span className="font-medium">{bestValueGap.ticker}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-[#a8b2bf]">Discount</span>
                    <span>{bestValueGap.discount_to_entry?.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {watchlist.length >= 3 && (
        <>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticker or company"
            className="ui-input mb-4 w-full"
          />

          <div className="mb-4 flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'ready', label: 'Ready to buy' },
              { key: 'research', label: 'Under research' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key as 'all' | 'ready' | 'research')}
                className={
                  activeFilter === f.key ? 'ui-link-pill-active' : 'ui-link-pill-idle'
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="space-y-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filteredWatchlist.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No watchlist items match your current search or filter.
          </div>
        ) : (
          filteredWatchlist.map((item) => {
            const hasCurrentPrice = item.current_price > 0
            const hasTargetEntry = item.target_entry != null && item.target_entry > 0
            const hasFairValue =
              item.fair_value_low != null && item.fair_value_high != null
            const hasDiscount = item.discount_to_entry != null
            const hasScore = item.scorecard_overall != null
            const hasAnyField =
              hasCurrentPrice || hasTargetEntry || hasFairValue || hasDiscount || hasScore

            return (
              <div key={item.id} className="ui-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-neutral-900 dark:text-[#e6eaf0]">
                        {item.ticker}
                      </span>
                      <span className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                        {item.company}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusBadgeClass(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      {item.sector} · Added {item.date_added}
                    </div>

                    {item.why_watching ? (
                      <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                        {item.why_watching}
                      </div>
                    ) : null}

                    <div className="mt-3 space-y-1 text-sm">
                      {hasCurrentPrice && (
                        <div className="flex justify-between gap-4">
                          <span className="text-neutral-600 dark:text-[#a8b2bf]">
                            Current price
                          </span>
                          <span>{formatCurrency(item.current_price)}</span>
                        </div>
                      )}

                      {hasTargetEntry && (
                        <div className="flex justify-between gap-4">
                          <span className="text-neutral-600 dark:text-[#a8b2bf]">
                            Target entry
                          </span>
                          <span>{formatCurrency(item.target_entry)}</span>
                        </div>
                      )}

                      {hasFairValue && (
                        <div className="flex justify-between gap-4">
                          <span className="text-neutral-600 dark:text-[#a8b2bf]">
                            Fair value
                          </span>
                          <span>
                            ${item.fair_value_low?.toFixed(0)}–${item.fair_value_high?.toFixed(0)}
                          </span>
                        </div>
                      )}

                      {hasDiscount && (
                        <div className="flex justify-between gap-4">
                          <span className="text-neutral-600 dark:text-[#a8b2bf]">
                            Discount to entry
                          </span>
                          <span
                            className={
                              (item.discount_to_entry ?? 0) > 0
                                ? 'text-green-500'
                                : 'text-red-500'
                            }
                          >
                            {item.discount_to_entry?.toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {hasScore && (
                        <div className="flex justify-between gap-4">
                          <span className="text-neutral-600 dark:text-[#a8b2bf]">
                            Analysis score
                          </span>
                          <span>{item.scorecard_overall?.toFixed(1)}</span>
                        </div>
                      )}

                      {!hasAnyField && (
                        <div className="italic text-xs text-neutral-500 dark:text-[#a8b2bf]">
                          Click &quot;Edit&quot; to add entry target and fair value, or use
                          &quot;Refresh Prices&quot; on the Dashboard.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <Link
                      href={buildResearchHref(item)}
                      className="ui-btn-secondary text-center text-xs px-3 py-1"
                    >
                      Analyze
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEditSheet(item)}
                      className="ui-btn-secondary text-xs px-3 py-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteItem(item)}
                      disabled={deletingId === item.id}
                      className="px-3 py-1 text-xs text-red-500 hover:text-red-700"
                    >
                      {deletingId === item.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingItem?.id ? `Edit ${editingItem.ticker}` : 'Add to watchlist'}
      >
        <WatchlistForm
          key={
            editingItem?.id
              ? editingItem.id
              : `new-watchlist-item-${editingItem?.ticker ?? 'blank'}`
          }
          initialItem={editingItem}
          onSubmit={handleSaveItem}
          onCancel={closeSheet}
          submitLabel={editingItem?.id ? 'Save changes' : 'Add to watchlist'}
          busy={formBusy}
        />
      </BottomSheet>
    </div>
  )
}

export default function InvestingWatchlistPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <SkeletonCard />
        </div>
      }
    >
      <InvestingWatchlistPageContent />
    </Suspense>
  )
}