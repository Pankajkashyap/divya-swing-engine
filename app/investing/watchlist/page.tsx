'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { StockAnalysis, WatchlistItem } from '@/app/investing/types'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { InlineStatusBanner } from '@/components/ui/InlineStatusBanner'
import { InvestingPageHeader } from '@/components/investing/InvestingPageHeader'
import { InvestingSearchToolbar } from '@/components/investing/InvestingSearchToolbar'
import { WatchlistForm } from '@/components/investing/WatchlistForm'
import { WatchlistTable } from '@/components/investing/WatchlistTable'
import { WatchlistCardList } from '@/components/investing/WatchlistCardList'
import { StockAnalysisForm } from '@/components/investing/StockAnalysisForm'

type EnrichedWatchlistItem = WatchlistItem & {
  latest_analysis_overall_score?: number | null
  latest_analysis_verdict?: StockAnalysis['verdict'] | null
  latest_analysis_confidence?: StockAnalysis['confidence'] | string | null
  latest_analysis_fair_value_low?: number | null
  latest_analysis_fair_value_high?: number | null
  latest_analysis_date?: string | null
  watchlist_action_hint?:
    | 'Ready to buy'
    | 'Keep watching'
    | 'Too extended'
    | 'Needs new analysis'
    | null
}

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

type StockAnalysisFormPayload = {
  ticker: string
  company: string
  analysis_date: string
  sector: StockAnalysis['sector']
  moat_score: number | null
  valuation_score: number | null
  mgmt_score: number | null
  roic_score: number | null
  fin_health_score: number | null
  biz_understanding_score: number | null
  verdict: StockAnalysis['verdict']
  fair_value_low: number | null
  fair_value_high: number | null
  thesis: string | null
  thesis_breakers: string | null
  confidence: StockAnalysis['confidence']
  raw_analysis: string | null
  moat_json?: Record<string, unknown> | null
  management_json?: Record<string, unknown> | null
  moat_score_auto?: number | null
  management_score_auto?: number | null
  qualitative_confidence?: string | null
  business_understanding_json?: Record<string, unknown> | null
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

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

function getWatchlistSavedViews() {
  return [
    { key: 'all', label: 'All' },
    { key: 'opportunity-queue', label: 'Opportunity Queue' },
    { key: 'high-conviction', label: 'High Conviction' },
    { key: 'needs-analysis', label: 'Needs Analysis' },
  ]
}

function getWatchlistFilters() {
  return [
    { key: 'all', label: 'All Filters' },
    { key: 'ready-to-buy', label: 'Ready to Buy' },
    { key: 'keep-watching', label: 'Keep Watching' },
    { key: 'high-confidence', label: 'High Confidence' },
  ]
}

function getWatchlistActionHint(args: {
  latestVerdict: StockAnalysis['verdict'] | null | undefined
  latestConfidence: StockAnalysis['confidence'] | string | null | undefined
  currentPrice: number | null | undefined
  fairValueLow: number | null | undefined
  fairValueHigh: number | null | undefined
}): 'Ready to buy' | 'Keep watching' | 'Too extended' | 'Needs new analysis' | null {
  const { latestVerdict, latestConfidence, currentPrice, fairValueLow, fairValueHigh } = args

  if (!latestVerdict) return 'Needs new analysis'

  if (
    currentPrice == null ||
    !Number.isFinite(currentPrice) ||
    fairValueLow == null ||
    !Number.isFinite(fairValueLow) ||
    fairValueHigh == null ||
    !Number.isFinite(fairValueHigh)
  ) {
    return latestVerdict === 'Strong Buy' || latestVerdict === 'Buy'
      ? 'Keep watching'
      : 'Needs new analysis'
  }

  if ((latestVerdict === 'Strong Buy' || latestVerdict === 'Buy') && currentPrice <= fairValueHigh) {
    return 'Ready to buy'
  }

  if (currentPrice > fairValueHigh) {
    return 'Too extended'
  }

  if (latestConfidence === 'Low') {
    return 'Needs new analysis'
  }

  return 'Keep watching'
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
      targetEntry != null && currentPrice > 0
        ? ((targetEntry - currentPrice) / currentPrice) * 100
        : null,
    created_at: '',
    updated_at: '',
    latest_analysis_overall_score: null,
    latest_analysis_verdict: null,
    latest_analysis_confidence: null,
    latest_analysis_fair_value_low: null,
    latest_analysis_fair_value_high: null,
    latest_analysis_date: null,
    watchlist_action_hint: null,
  }
}

function watchlistToAnalysisSeed(item: WatchlistItem): StockAnalysis {
  return {
    id: '',
    user_id: null,
    ticker: item.ticker,
    company: item.company,
    analysis_date: getTodayDateString(),
    sector: item.sector,
    moat_score: null,
    valuation_score: null,
    mgmt_score: null,
    roic_score: null,
    fin_health_score: null,
    biz_understanding_score: null,
    overall_score: item.scorecard_overall ?? null,
    verdict: null,
    fair_value_low: item.fair_value_low ?? null,
    fair_value_high: item.fair_value_high ?? null,
    thesis: item.why_watching ?? null,
    thesis_breakers: null,
    confidence: null,
    raw_analysis: item.why_watching ?? null,
    created_at: '',
    updated_at: '',
  }
}

function InvestingWatchlistPageContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const searchParams = useSearchParams()

  const queryMode = searchParams.get('mode')
  const queryPrefillItem = useMemo(
    () => (queryMode === 'new' ? buildPrefilledWatchlistItem(searchParams) : null),
    [queryMode, searchParams]
  )

  const [items, setItems] = useState<EnrichedWatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [savedView, setSavedView] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')

  const [sheetOpen, setSheetOpen] = useState(
    () => queryMode === 'new' && !!buildPrefilledWatchlistItem(searchParams)
  )
  const [editingItem, setEditingItem] = useState<EnrichedWatchlistItem | null>(
    () => (queryMode === 'new' ? buildPrefilledWatchlistItem(searchParams) : null)
  )
  const [formBusy, setFormBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [analysisSheetOpen, setAnalysisSheetOpen] = useState(false)
  const [analysisSourceItem, setAnalysisSourceItem] = useState<EnrichedWatchlistItem | null>(null)
  const [analysisBusy, setAnalysisBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const [{ data: watchlistData, error: watchlistError }, { data: analysisData, error: analysisError }] =
        await Promise.all([
          supabase.from('investing_watchlist').select('*').order('date_added', { ascending: false }),
          supabase
            .from('investing_stock_analyses')
            .select('*')
            .order('analysis_date', { ascending: false }),
        ])

      if (cancelled) return

      if (watchlistError) {
        setError(watchlistError.message)
        setLoading(false)
        return
      }

      if (analysisError) {
        setError(analysisError.message)
        setLoading(false)
        return
      }

      const latestAnalysisByTicker = new Map<string, StockAnalysis>()

      for (const analysis of (analysisData ?? []) as StockAnalysis[]) {
        const ticker = analysis.ticker?.toUpperCase?.() ?? ''
        if (!ticker) continue

        if (!latestAnalysisByTicker.has(ticker)) {
          latestAnalysisByTicker.set(ticker, analysis)
        }
      }

      const enrichedWatchlist: EnrichedWatchlistItem[] = ((watchlistData ?? []) as WatchlistItem[]).map(
        (item) => {
          const latestAnalysis = latestAnalysisByTicker.get(item.ticker.toUpperCase())
          const latestVerdict = latestAnalysis?.verdict ?? latestAnalysis?.verdict_auto ?? null
          const latestConfidence =
            latestAnalysis?.confidence ?? latestAnalysis?.confidence_auto ?? null
          const latestFairValueLow = latestAnalysis?.fair_value_low ?? null
          const latestFairValueHigh = latestAnalysis?.fair_value_high ?? null

          return {
            ...item,
            latest_analysis_overall_score: latestAnalysis?.overall_score ?? null,
            latest_analysis_verdict: latestVerdict,
            latest_analysis_confidence: latestConfidence,
            latest_analysis_fair_value_low: latestFairValueLow,
            latest_analysis_fair_value_high: latestFairValueHigh,
            latest_analysis_date: latestAnalysis?.analysis_date ?? null,
            watchlist_action_hint: getWatchlistActionHint({
              latestVerdict,
              latestConfidence,
              currentPrice: item.current_price,
              fairValueLow: latestFairValueLow,
              fairValueHigh: latestFairValueHigh,
            }),
          }
        }
      )

      setItems(enrichedWatchlist)
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()

    let result = items.filter((item) => {
      if (!term) return true

      return (
        item.ticker.toLowerCase().includes(term) ||
        item.company.toLowerCase().includes(term) ||
        item.sector.toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term) ||
        (item.latest_analysis_verdict ?? '').toLowerCase().includes(term) ||
        (item.latest_analysis_confidence ?? '').toLowerCase().includes(term) ||
        (item.watchlist_action_hint ?? '').toLowerCase().includes(term)
      )
    })

    if (savedView === 'opportunity-queue') {
      result = result.filter(
        (item) =>
          item.watchlist_action_hint === 'Ready to buy' ||
          item.watchlist_action_hint === 'Keep watching'
      )
    }

    if (savedView === 'high-conviction') {
      result = result.filter((item) => {
        const verdict = item.latest_analysis_verdict ?? null
        const confidence = item.latest_analysis_confidence ?? null
        return (verdict === 'Strong Buy' || verdict === 'Buy') && confidence === 'High'
      })
    }

    if (savedView === 'needs-analysis') {
      result = result.filter((item) => item.watchlist_action_hint === 'Needs new analysis')
    }

    if (activeFilter === 'ready-to-buy') {
      result = result.filter((item) => item.watchlist_action_hint === 'Ready to buy')
    }

    if (activeFilter === 'keep-watching') {
      result = result.filter((item) => item.watchlist_action_hint === 'Keep watching')
    }

    if (activeFilter === 'high-confidence') {
      result = result.filter((item) => item.latest_analysis_confidence === 'High')
    }

    return result
  }, [items, search, savedView, activeFilter])

  const priorityItems = useMemo(() => {
    return filteredItems.filter((item) => item.status !== 'Removed')
  }, [filteredItems])

  const summary = useMemo(() => {
    const readyToBuy = items.filter((item) => item.status === 'Ready to buy').length
    const approachingEntry = items.filter(
      (item) => item.status === 'Watching — approaching entry'
    ).length
    const underResearch = items.filter((item) => item.status === 'Under research').length

    const activeItems = items.filter((item) => item.status !== 'Removed')

    const avgDiscount =
      activeItems.length > 0
        ? activeItems.reduce((sum, item) => sum + Number(item.discount_to_entry ?? 0), 0) /
          activeItems.length
        : 0

    return {
      total: items.length,
      readyToBuy,
      approachingEntry,
      underResearch,
      avgDiscount,
      activeItems,
    }
  }, [items])

  function openAddSheet() {
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

  function openAnalysisSheet(item: EnrichedWatchlistItem) {
    setSuccess(null)
    setAnalysisSourceItem(item)
    setAnalysisSheetOpen(true)
  }

  function closeAnalysisSheet() {
    if (analysisBusy) return
    setAnalysisSheetOpen(false)
    setAnalysisSourceItem(null)
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
      payload.target_entry != null && payload.current_price > 0
        ? ((payload.target_entry - payload.current_price) / payload.current_price) * 100
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
                  discount_to_entry: discountToEntry,
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

  async function handleCreateAnalysis(payload: StockAnalysisFormPayload) {
    if (!analysisSourceItem) return

    setAnalysisBusy(true)
    setError(null)
    setSuccess(null)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      setError(authError.message)
      setAnalysisBusy(false)
      return
    }

    const record = {
      user_id: user?.id ?? null,
      ticker: payload.ticker,
      company: payload.company,
      analysis_date: payload.analysis_date,
      sector: payload.sector,
      moat_score: payload.moat_score,
      valuation_score: payload.valuation_score,
      mgmt_score: payload.mgmt_score,
      roic_score: payload.roic_score,
      fin_health_score: payload.fin_health_score,
      biz_understanding_score: payload.biz_understanding_score,
      verdict: payload.verdict,
      fair_value_low: payload.fair_value_low,
      fair_value_high: payload.fair_value_high,
      thesis: payload.thesis,
      thesis_breakers: payload.thesis_breakers,
      confidence: payload.confidence,
      raw_analysis: payload.raw_analysis,
      moat_json: payload.moat_json ?? null,
      management_json: payload.management_json ?? null,
      moat_score_auto: payload.moat_score_auto ?? null,
      management_score_auto: payload.management_score_auto ?? null,
      qualitative_confidence: payload.qualitative_confidence ?? null,
      business_understanding_json: payload.business_understanding_json ?? null,
    }

    const { error: insertError } = await supabase.from('investing_stock_analyses').insert(record)

    if (insertError) {
      setError(insertError.message)
      setAnalysisBusy(false)
      return
    }

    setAnalysisBusy(false)
    setAnalysisSheetOpen(false)
    setAnalysisSourceItem(null)
    setSuccess(`Created analysis for ${payload.ticker}.`)
  }

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Watchlist"
        subtitle="Monitor valuation gaps, entry levels, and research status for future investments."
        actions={
          <>
            {summary.activeItems[0] ? (
              <button
                type="button"
                onClick={() => openAnalysisSheet(summary.activeItems[0])}
                className="ui-btn-secondary"
              >
                Analyze latest idea
              </button>
            ) : null}
            <button type="button" onClick={openAddSheet} className="ui-btn-primary">
              Add watchlist item
            </button>
          </>
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
            <DataCard title="Watchlist Summary">
              <DataCardRow label="Total names" value={String(summary.total)} />
              <DataCardRow label="Ready to buy" value={String(summary.readyToBuy)} />
              <DataCardRow
                label="Approaching entry"
                value={String(summary.approachingEntry)}
              />
            </DataCard>

            <DataCard title="Research Queue">
              <DataCardRow label="Under research" value={String(summary.underResearch)} />
              <DataCardRow
                label="Average discount"
                value={formatPercent(summary.avgDiscount)}
              />
              <DataCardRow
                label="Removed"
                value={String(items.filter((item) => item.status === 'Removed').length)}
              />
            </DataCard>

            <DataCard title="Best Value Gap">
              {summary.activeItems.length === 0 ? (
                <DataCardRow label="No watchlist yet" value="—" />
              ) : (
                (() => {
                  const sorted = [...summary.activeItems].sort(
                    (a, b) =>
                      Number(b.discount_to_entry ?? -999) - Number(a.discount_to_entry ?? -999)
                  )
                  const top = sorted[0]
                  return (
                    <>
                      <DataCardRow label="Ticker" value={top?.ticker ?? '—'} />
                      <DataCardRow
                        label="Discount"
                        value={formatPercent(top?.discount_to_entry ?? null)}
                      />
                      <DataCardRow label="Status" value={top?.status ?? '—'} />
                    </>
                  )
                })()
              )}
            </DataCard>

            <DataCard title="Most Actionable">
              {summary.activeItems.length === 0 ? (
                <DataCardRow label="No watchlist yet" value="—" />
              ) : (
                (() => {
                  const top =
                    summary.activeItems.find((item) => item.status === 'Ready to buy') ??
                    summary.activeItems.find(
                      (item) => item.status === 'Watching — approaching entry'
                    ) ??
                    summary.activeItems[0]

                  return (
                    <>
                      <DataCardRow label="Ticker" value={top?.ticker ?? '—'} />
                      <DataCardRow
                        label="Current price"
                        value={formatCurrency(top?.current_price ?? null)}
                      />
                      <DataCardRow
                        label="Target entry"
                        value={formatCurrency(top?.target_entry ?? null)}
                      />
                    </>
                  )
                })()
              )}
            </DataCard>
          </>
        )}
      </section>

      {!loading && items.length > 0 ? (
        <InvestingSearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search ticker, company, sector, status, verdict, confidence, or action hint"
          savedViews={getWatchlistSavedViews()}
          activeSavedViewKey={savedView}
          onSavedViewChange={setSavedView}
          filters={getWatchlistFilters()}
          activeFilterKey={activeFilter}
          onFilterChange={setActiveFilter}
          onClearFilters={() => {
            setSearch('')
            setSavedView('all')
            setActiveFilter('all')
          }}
        />
      ) : null}

      <CollapsibleSection
        title="Priority watchlist"
        subtitle="Mobile-first card view of current watchlist names."
        defaultOpen={true}
      >
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : priorityItems.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No active watchlist items found.
          </div>
        ) : (
          <div className="space-y-3">
            {priorityItems.map((item) => (
              <div key={item.id} className="space-y-2">
                <WatchlistCardList
                  items={[item]}
                  onEdit={openEditSheet}
                  onDelete={handleDeleteItem}
                  deletingId={deletingId}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => openAnalysisSheet(item)}
                    className="ui-btn-secondary"
                  >
                    Analyze
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Watchlist table"
        subtitle="Search and scan the full watchlist in a denser format."
        defaultOpen={false}
      >
        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="space-y-3">
            <WatchlistTable
              items={filteredItems}
              onEdit={openEditSheet}
              onDelete={handleDeleteItem}
              deletingId={deletingId}
            />
            {filteredItems.length > 0 ? (
              <div className="ui-card p-4">
                <div className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                  Start an analysis directly from any watchlist idea:
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {filteredItems.map((item) => (
                    <button
                      key={`analyze-${item.id}`}
                      type="button"
                      onClick={() => openAnalysisSheet(item)}
                      className="ui-btn-secondary"
                    >
                      Analyze {item.ticker}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CollapsibleSection>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingItem?.id ? `Edit ${editingItem.ticker}` : 'Add watchlist item'}
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
          submitLabel={editingItem?.id ? 'Save changes' : 'Add watchlist item'}
          busy={formBusy}
        />
      </BottomSheet>

      <BottomSheet
        open={analysisSheetOpen}
        onClose={closeAnalysisSheet}
        title={analysisSourceItem ? `Analyze ${analysisSourceItem.ticker}` : 'Start analysis'}
      >
        {analysisSourceItem ? (
          <StockAnalysisForm
            key={`analysis-${analysisSourceItem.id || analysisSourceItem.ticker}`}
            initialAnalysis={watchlistToAnalysisSeed(analysisSourceItem)}
            onSubmit={handleCreateAnalysis}
            onCancel={closeAnalysisSheet}
            submitLabel="Create analysis"
            busy={analysisBusy}
          />
        ) : null}
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