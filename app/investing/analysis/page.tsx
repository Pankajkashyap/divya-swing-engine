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
import { StockAnalysisForm } from '@/components/investing/StockAnalysisForm'
import { AnalysisTable } from '@/components/investing/AnalysisTable'
import { AnalysisCardList } from '@/components/investing/AnalysisCardList'
import { WatchlistForm } from '@/components/investing/WatchlistForm'
import { runRoicScore } from '@/app/investing/lib/scoring/runRoicScore'

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
  moat_json: Record<string, unknown> | null
  management_json: Record<string, unknown> | null
  moat_score_auto: number | null
  management_score_auto: number | null
  qualitative_confidence: string | null
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

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(1)
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

function buildPrefilledAnalysis(searchParams: URLSearchParams): StockAnalysis | null {
  const ticker = searchParams.get('ticker')?.trim().toUpperCase() ?? ''
  if (!ticker) return null

  const company = searchParams.get('company')?.trim() ?? ticker
  const sectorParam = searchParams.get('sector')?.trim()
  const verdictParam = searchParams.get('verdict')?.trim() as StockAnalysis['verdict'] | null
  const confidenceParam = searchParams.get('confidence')?.trim() as StockAnalysis['confidence'] | null

  return {
    id: '',
    user_id: null,
    ticker,
    company,
    analysis_date: getTodayDateString(),
    sector: (sectorParam as StockAnalysis['sector']) ?? 'Technology',
    moat_score: toNullableNumber(searchParams.get('moat_score')),
    valuation_score: toNullableNumber(searchParams.get('valuation_score')),
    mgmt_score: toNullableNumber(searchParams.get('mgmt_score')),
    roic_score: toNullableNumber(searchParams.get('roic_score')),
    fin_health_score: toNullableNumber(searchParams.get('fin_health_score')),
    biz_understanding_score: toNullableNumber(searchParams.get('biz_understanding_score')),
    overall_score: toNullableNumber(searchParams.get('overall_score')),
    verdict: verdictParam,
    fair_value_low: toNullableNumber(searchParams.get('fair_value_low')),
    fair_value_high: toNullableNumber(searchParams.get('fair_value_high')),
    thesis: searchParams.get('thesis')?.trim() || null,
    thesis_breakers: searchParams.get('thesis_breakers')?.trim() || null,
    confidence: confidenceParam,
    raw_analysis: searchParams.get('raw_analysis')?.trim() || null,
    created_at: '',
    updated_at: '',
    roic_score_auto: null,
    roic_score_explanation: null,
  }
}

function analysisToWatchlistSeed(analysis: StockAnalysis): WatchlistItem {
  return {
    id: '',
    user_id: null,
    ticker: analysis.ticker,
    company: analysis.company,
    sector: analysis.sector,
    why_watching: analysis.thesis ?? null,
    target_entry: analysis.fair_value_low ?? null,
    current_price: 0,
    fair_value_low: analysis.fair_value_low ?? null,
    fair_value_high: analysis.fair_value_high ?? null,
    scorecard_overall: analysis.overall_score ?? null,
    status:
      analysis.verdict === 'Strong Buy' || analysis.verdict === 'Buy'
        ? 'Ready to buy'
        : 'Under research',
    date_added: getTodayDateString(),
    discount_to_entry: null,
    created_at: '',
    updated_at: '',
  }
}

function InvestingAnalysisPageContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const searchParams = useSearchParams()

  const queryMode = searchParams.get('mode')
  const prefilledRoicTtm = toNullableNumber(searchParams.get('roic_ttm'))
  const prefilledRoic5yAvg = toNullableNumber(searchParams.get('roic_5y_avg'))
  const prefilledRoeTtm = toNullableNumber(searchParams.get('roe_ttm'))
  const queryPrefillAnalysis = useMemo(
    () => (queryMode === 'new' ? buildPrefilledAnalysis(searchParams) : null),
    [queryMode, searchParams]
  )

  const [analyses, setAnalyses] = useState<StockAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [sheetOpen, setSheetOpen] = useState(
    () => queryMode === 'new' && !!buildPrefilledAnalysis(searchParams)
  )
  const [editingAnalysis, setEditingAnalysis] = useState<StockAnalysis | null>(
    () => (queryMode === 'new' ? buildPrefilledAnalysis(searchParams) : null)
  )
  const [formBusy, setFormBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [watchlistSheetOpen, setWatchlistSheetOpen] = useState(false)
  const [watchlistSourceAnalysis, setWatchlistSourceAnalysis] = useState<StockAnalysis | null>(
    null
  )
  const [watchlistBusy, setWatchlistBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error: loadError } = await supabase
        .from('investing_stock_analyses')
        .select('*')
        .order('analysis_date', { ascending: false })

      if (cancelled) return

      if (loadError) {
        setError(loadError.message)
        setLoading(false)
        return
      }

      setAnalyses((data ?? []) as StockAnalysis[])
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const filteredAnalyses = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return analyses

    return analyses.filter((analysis) => {
      return (
        analysis.ticker.toLowerCase().includes(term) ||
        analysis.company.toLowerCase().includes(term) ||
        analysis.sector.toLowerCase().includes(term) ||
        (analysis.verdict ?? '').toLowerCase().includes(term)
      )
    })
  }, [analyses, search])

  const summary = useMemo(() => {
    const strongBuys = analyses.filter((a) => a.verdict === 'Strong Buy').length
    const buys = analyses.filter((a) => a.verdict === 'Buy').length
    const holds = analyses.filter((a) => a.verdict === 'Hold').length

    const scoredAnalyses = analyses.filter((a) => a.overall_score != null)
    const avgScore =
      scoredAnalyses.length > 0
        ? scoredAnalyses.reduce((sum, a) => sum + Number(a.overall_score), 0) /
          scoredAnalyses.length
        : 0

    return {
      total: analyses.length,
      strongBuys,
      buys,
      holds,
      avgScore,
    }
  }, [analyses])

  const latestAnalysis = useMemo(() => analyses[0] ?? null, [analyses])

  function openAddSheet() {
    setSuccess(null)
    setEditingAnalysis(queryPrefillAnalysis)
    setSheetOpen(true)
  }

  function openEditSheet(analysis: StockAnalysis) {
    setSuccess(null)
    setEditingAnalysis(analysis)
    setSheetOpen(true)
  }

  function closeSheet() {
    if (formBusy) return
    setSheetOpen(false)
    setEditingAnalysis(null)
  }

  function openWatchlistSheet(analysis: StockAnalysis) {
    setSuccess(null)
    setWatchlistSourceAnalysis(analysis)
    setWatchlistSheetOpen(true)
  }

  function closeWatchlistSheet() {
    if (watchlistBusy) return
    setWatchlistSheetOpen(false)
    setWatchlistSourceAnalysis(null)
  }

  async function handleSaveAnalysis(payload: StockAnalysisFormPayload) {
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

    const roicScoreResult = runRoicScore({
      sector: payload.sector,
      roicTtm: prefilledRoicTtm,
      roic5yAvg: prefilledRoic5yAvg,
      roeTtm: prefilledRoeTtm,
    })

    const effectiveRoicScore = payload.roic_score ?? roicScoreResult.score

    const scoreValues = [
      payload.moat_score,
      payload.valuation_score,
      payload.mgmt_score,
      effectiveRoicScore,
      payload.fin_health_score,
      payload.biz_understanding_score,
    ].filter((value): value is number => value != null)

    const overallScore =
      scoreValues.length > 0
        ? scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length
        : null

    const record = {
      user_id: user?.id ?? null,
      ticker: payload.ticker,
      company: payload.company,
      analysis_date: payload.analysis_date,
      sector: payload.sector,
      moat_score: payload.moat_score,
      valuation_score: payload.valuation_score,
      mgmt_score: payload.mgmt_score,
      roic_score: effectiveRoicScore,
      fin_health_score: payload.fin_health_score,
      biz_understanding_score: payload.biz_understanding_score,
      overall_score: overallScore,
      verdict: payload.verdict,
      fair_value_low: payload.fair_value_low,
      fair_value_high: payload.fair_value_high,
      thesis: payload.thesis,
      thesis_breakers: payload.thesis_breakers,
      confidence: payload.confidence,
      raw_analysis: payload.raw_analysis,
      moat_json: payload.moat_json,
      management_json: payload.management_json,
      moat_score_auto: payload.moat_score_auto,
      management_score_auto: payload.management_score_auto,
      qualitative_confidence: payload.qualitative_confidence,
      qualitative_imported_at: payload.moat_json || payload.management_json ? new Date().toISOString() : null,
      roic_score_auto: roicScoreResult.score,
      roic_score_explanation: roicScoreResult.explanation,
    }

    if (editingAnalysis && editingAnalysis.id) {
      const { error: updateError } = await supabase
        .from('investing_stock_analyses')
        .update(record)
        .eq('id', editingAnalysis.id)

      if (updateError) {
        setError(updateError.message)
        setFormBusy(false)
        return
      }

      setAnalyses((prev) =>
        prev
          .map((analysis) =>
            analysis.id === editingAnalysis.id
              ? {
                  ...analysis,
                  ...record,
                }
              : analysis
          )
          .sort((a, b) => b.analysis_date.localeCompare(a.analysis_date))
      )

      setSuccess(`Updated ${payload.ticker} analysis.`)
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('investing_stock_analyses')
        .insert(record)
        .select('*')
        .single()

      if (insertError) {
        setError(insertError.message)
        setFormBusy(false)
        return
      }

      setAnalyses((prev) =>
        [inserted as StockAnalysis, ...prev].sort((a, b) =>
          b.analysis_date.localeCompare(a.analysis_date)
        )
      )

      setSuccess(`Added ${payload.ticker} analysis.`)
    }

    setFormBusy(false)
    setSheetOpen(false)
    setEditingAnalysis(null)
  }

  async function handleDeleteAnalysis(analysis: StockAnalysis) {
    const confirmed = window.confirm(`Delete analysis for ${analysis.ticker}?`)
    if (!confirmed) return

    setDeletingId(analysis.id)
    setError(null)
    setSuccess(null)

    const { error: deleteError } = await supabase
      .from('investing_stock_analyses')
      .delete()
      .eq('id', analysis.id)

    if (deleteError) {
      setError(deleteError.message)
      setDeletingId(null)
      return
    }

    setAnalyses((prev) => prev.filter((item) => item.id !== analysis.id))
    setDeletingId(null)
    setSuccess(`Deleted ${analysis.ticker} analysis.`)
  }

  async function handleAddToWatchlist(payload: WatchlistFormPayload) {
    if (!watchlistSourceAnalysis) return

    setWatchlistBusy(true)
    setError(null)
    setSuccess(null)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      setError(authError.message)
      setWatchlistBusy(false)
      return
    }

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

    const { error: insertError } = await supabase.from('investing_watchlist').insert(record)

    if (insertError) {
      setError(insertError.message)
      setWatchlistBusy(false)
      return
    }

    setWatchlistBusy(false)
    setWatchlistSheetOpen(false)
    setSuccess(`Added ${payload.ticker} to watchlist.`)
    setWatchlistSourceAnalysis(null)
  }

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Analysis"
        subtitle="Review completed stock analyses, scorecards, fair value ranges, and investment theses."
        actions={
          <>
            {latestAnalysis ? (
              <button
                type="button"
                onClick={() => openWatchlistSheet(latestAnalysis)}
                className="ui-btn-secondary"
              >
                Add latest to watchlist
              </button>
            ) : null}
            <button type="button" onClick={openAddSheet} className="ui-btn-primary">
              Add analysis
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
            <DataCard title="Analysis Summary">
              <DataCardRow label="Total analyses" value={String(summary.total)} />
              <DataCardRow label="Strong Buy" value={String(summary.strongBuys)} />
              <DataCardRow label="Buy" value={String(summary.buys)} />
            </DataCard>

            <DataCard title="Verdict Mix">
              <DataCardRow label="Hold" value={String(summary.holds)} />
              <DataCardRow label="Average score" value={formatScore(summary.avgScore)} />
              <DataCardRow
                label="Latest date"
                value={latestAnalysis ? formatDate(latestAnalysis.analysis_date) : '—'}
              />
            </DataCard>

            <DataCard title="Latest Analysis">
              <DataCardRow label="Ticker" value={latestAnalysis?.ticker ?? '—'} />
              <DataCardRow label="Verdict" value={latestAnalysis?.verdict ?? '—'} />
              <DataCardRow
                label="Overall score"
                value={formatScore(latestAnalysis?.overall_score)}
              />
            </DataCard>

            <DataCard title="Fair Value Snapshot">
              <DataCardRow label="Low" value={formatCurrency(latestAnalysis?.fair_value_low)} />
              <DataCardRow label="High" value={formatCurrency(latestAnalysis?.fair_value_high)} />
              <DataCardRow label="Confidence" value={latestAnalysis?.confidence ?? '—'} />
            </DataCard>
          </>
        )}
      </section>

      {!loading && analyses.length > 0 ? (
        <InvestingSearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search ticker, company, sector, or verdict"
        />
      ) : null}

      <CollapsibleSection
        title="Recent analyses"
        subtitle="Mobile-first card view of the most recent completed analyses."
        defaultOpen={true}
      >
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <AnalysisCardList
            analyses={filteredAnalyses}
            onEdit={openEditSheet}
            onDelete={handleDeleteAnalysis}
            deletingId={deletingId}
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Analysis table"
        subtitle="Search and scan the full analysis history in a denser format."
        defaultOpen={false}
      >
        {loading ? (
          <SkeletonCard />
        ) : (
          <AnalysisTable
            analyses={filteredAnalyses}
            onEdit={openEditSheet}
            onDelete={handleDeleteAnalysis}
            deletingId={deletingId}
          />
        )}
      </CollapsibleSection>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingAnalysis?.id ? `Edit ${editingAnalysis.ticker}` : 'Add analysis'}
      >
        <StockAnalysisForm
          key={
            editingAnalysis?.id
              ? editingAnalysis.id
              : `new-analysis-${editingAnalysis?.ticker ?? 'blank'}`
          }
          initialAnalysis={editingAnalysis}
          onSubmit={handleSaveAnalysis}
          onCancel={closeSheet}
          submitLabel={editingAnalysis?.id ? 'Save changes' : 'Add analysis'}
          busy={formBusy}
        />
      </BottomSheet>

      <BottomSheet
        open={watchlistSheetOpen}
        onClose={closeWatchlistSheet}
        title={
          watchlistSourceAnalysis
            ? `Add ${watchlistSourceAnalysis.ticker} to watchlist`
            : 'Add to watchlist'
        }
      >
        {watchlistSourceAnalysis ? (
          <WatchlistForm
            key={`watchlist-${watchlistSourceAnalysis.id || watchlistSourceAnalysis.ticker}`}
            initialItem={analysisToWatchlistSeed(watchlistSourceAnalysis)}
            onSubmit={handleAddToWatchlist}
            onCancel={closeWatchlistSheet}
            submitLabel="Add to watchlist"
            busy={watchlistBusy}
          />
        ) : null}
      </BottomSheet>
    </div>
  )
}

export default function InvestingAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <SkeletonCard />
        </div>
      }
    >
      <InvestingAnalysisPageContent />
    </Suspense>
  )
}