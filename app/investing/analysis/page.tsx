'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createInvestingBrowserClient } from '@/app/investing/lib/supabaseBrowser'
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
import { runFinancialHealthScore } from '@/app/investing/lib/scoring/runFinancialHealthScore'
import { runBusinessUnderstandingScore } from '@/app/investing/lib/scoring/runBusinessUnderstandingScore'
import { runValuationScore } from '@/app/investing/lib/scoring/runValuationScore'
import { runConfidenceScore } from '@/app/investing/lib/scoring/runConfidenceScore'
import { runVerdictScore } from '@/app/investing/lib/scoring/runVerdictScore'

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
  business_understanding_json: Record<string, unknown> | null
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

type SavedAnalysisView = {
  id: string
  user_id: string
  page_key: string
  name: string
  query_text: string | null
  saved_view_key: string | null
  filter_key: string | null
  created_at: string
  updated_at: string
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

function getAnalysisSavedViews() {
  return [
    { key: 'all', label: 'All' },
    { key: 'high-conviction', label: 'High Conviction' },
    { key: 'recent-30d', label: 'Last 30 Days' },
    { key: 'manual-verdict', label: 'Manual Verdicts' },
    { key: 'auto-verdict', label: 'Auto Verdicts' },
  ]
}

function getAnalysisFilters() {
  return [
    { key: 'all', label: 'All Filters' },
    { key: 'high-confidence', label: 'High Confidence' },
    { key: 'buy-or-strong-buy', label: 'Buy / Strong Buy' },
    { key: 'hold-or-worse', label: 'Hold or Worse' },
  ]
}

function isWithinLast30Days(dateString: string | null | undefined) {
  if (!dateString) return false
  const today = new Date()
  const target = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(target.getTime())) return false
  const diffMs = today.getTime() - target.getTime()
  return diffMs <= 30 * 24 * 60 * 60 * 1000
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
    moat_json: null,
    management_json: null,
    moat_score_auto: null,
    management_score_auto: null,
    qualitative_confidence: null,
    qualitative_imported_at: null,
    roic_score_auto: null,
    roic_score_explanation: null,
    fin_health_score_auto: null,
    fin_health_score_explanation: null,
    valuation_score_auto: null,
    valuation_score_explanation: null,
    confidence_auto: null,
    confidence_explanation: null,
    verdict_auto: null,
    verdict_explanation: null,
    business_understanding_json: null,
    biz_understanding_score_auto: null,
    biz_understanding_score_explanation: null,
  }
}

function analysisToWatchlistSeed(analysis: StockAnalysis): WatchlistItem {
  const verdict = analysis.verdict ?? analysis.verdict_auto ?? null

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
      verdict === 'Strong Buy' || verdict === 'Buy'
        ? 'Ready to buy'
        : 'Under research',
    date_added: getTodayDateString(),
    discount_to_entry: null,
    created_at: '',
    updated_at: '',
  }
}

function InvestingAnalysisPageContent() {
const supabase = useMemo(() => createInvestingBrowserClient(), [])
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const queryMode = searchParams.get('mode')
  const prefilledRoicTtm = toNullableNumber(searchParams.get('roic_ttm'))
  const prefilledRoic5yAvg = toNullableNumber(searchParams.get('roic_5y_avg'))
  const prefilledRoeTtm = toNullableNumber(searchParams.get('roe_ttm'))
  const prefilledCurrentPrice = toNullableNumber(searchParams.get('current_price'))
  const prefilledFairValueLow = toNullableNumber(searchParams.get('fair_value_low'))
  const prefilledFairValueBase = toNullableNumber(searchParams.get('fair_value_base'))
  const prefilledFairValueHigh = toNullableNumber(searchParams.get('fair_value_high'))
  const prefilledDebtToEquity = toNullableNumber(searchParams.get('debt_to_equity'))
  const prefilledNetDebtToEbitda = toNullableNumber(searchParams.get('net_debt_to_ebitda'))
  const prefilledInterestCoverage = toNullableNumber(searchParams.get('interest_coverage'))
  const prefilledCurrentRatio = toNullableNumber(searchParams.get('current_ratio'))
  const prefilledFreeCashFlowTtm = toNullableNumber(searchParams.get('free_cash_flow_ttm'))
  const prefilledCriticalRedFlags = toNullableNumber(searchParams.get('critical_red_flags')) ?? 0
  const prefilledWarningRedFlags = toNullableNumber(searchParams.get('warning_red_flags')) ?? 0

  const queryPrefillAnalysis = useMemo(
    () => (queryMode === 'new' ? buildPrefilledAnalysis(searchParams) : null),
    [queryMode, searchParams]
  )

  const [analyses, setAnalyses] = useState<StockAnalysis[]>([])
  const [dbSavedViews, setDbSavedViews] = useState<SavedAnalysisView[]>([])
  const [activeDbSavedViewId, setActiveDbSavedViewId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [autoAnalyzeTicker, setAutoAnalyzeTicker] = useState('')
  const [autoAnalyzeLoading, setAutoAnalyzeLoading] = useState(false)

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [savedView, setSavedView] = useState(() => searchParams.get('view') ?? 'all')
  const [activeFilter, setActiveFilter] = useState(() => searchParams.get('filter') ?? 'all')

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (search.trim()) {
      params.set('q', search.trim())
    } else {
      params.delete('q')
    }

    if (savedView !== 'all') {
      params.set('view', savedView)
    } else {
      params.delete('view')
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
  }, [search, savedView, activeFilter, pathname, router, searchParams])

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

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const [analysisRes, savedViewsRes] = await Promise.all([
        supabase
          .from('investing_stock_analyses')
          .select('*')
          .order('analysis_date', { ascending: false }),
        user?.id
          ? supabase
              .from('investing_saved_views')
              .select('*')
              .eq('user_id', user.id)
              .eq('page_key', 'analysis')
              .order('created_at', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ])

      if (cancelled) return

      if (analysisRes.error) {
        setError(analysisRes.error.message)
        setLoading(false)
        return
      }

      setAnalyses((analysisRes.data ?? []) as StockAnalysis[])
      setDbSavedViews((savedViewsRes.data ?? []) as SavedAnalysisView[])
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const filteredAnalyses = useMemo(() => {
    const term = search.trim().toLowerCase()

    let result = analyses.filter((analysis) => {
      if (!term) return true

      return (
        analysis.ticker.toLowerCase().includes(term) ||
        analysis.company.toLowerCase().includes(term) ||
        analysis.sector.toLowerCase().includes(term) ||
        (analysis.verdict ?? analysis.verdict_auto ?? '').toLowerCase().includes(term) ||
        (analysis.confidence ?? analysis.confidence_auto ?? '').toLowerCase().includes(term)
      )
    })

    if (savedView === 'high-conviction') {
      result = result.filter((analysis) => {
        const verdict = analysis.verdict ?? analysis.verdict_auto ?? null
        const confidence = analysis.confidence ?? analysis.confidence_auto ?? null
        return (verdict === 'Strong Buy' || verdict === 'Buy') && confidence === 'High'
      })
    }

    if (savedView === 'recent-30d') {
      result = result.filter((analysis) => isWithinLast30Days(analysis.analysis_date))
    }

    if (savedView === 'manual-verdict') {
      result = result.filter((analysis) => analysis.verdict != null)
    }

    if (savedView === 'auto-verdict') {
      result = result.filter((analysis) => analysis.verdict == null && analysis.verdict_auto != null)
    }

    if (activeFilter === 'high-confidence') {
      result = result.filter(
        (analysis) => (analysis.confidence ?? analysis.confidence_auto ?? null) === 'High'
      )
    }

    if (activeFilter === 'buy-or-strong-buy') {
      result = result.filter((analysis) => {
        const verdict = analysis.verdict ?? analysis.verdict_auto ?? null
        return verdict === 'Buy' || verdict === 'Strong Buy'
      })
    }

    if (activeFilter === 'hold-or-worse') {
      result = result.filter((analysis) => {
        const verdict = analysis.verdict ?? analysis.verdict_auto ?? null
        return verdict === 'Hold' || verdict === 'Avoid' || verdict === 'Red Flag'
      })
    }

    return result
  }, [analyses, search, savedView, activeFilter])

  const summary = useMemo(() => {
    const strongBuys = analyses.filter(
      (a) => (a.verdict ?? a.verdict_auto ?? null) === 'Strong Buy'
    ).length
    const buys = analyses.filter((a) => (a.verdict ?? a.verdict_auto ?? null) === 'Buy').length
    const holds = analyses.filter((a) => (a.verdict ?? a.verdict_auto ?? null) === 'Hold').length

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

  async function handleSaveCurrentDbView() {
    const name = window.prompt('Enter a name for this saved view:')
    if (!name?.trim()) return

    setError(null)
    setSuccess(null)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      setError(authError?.message ?? 'Unable to load current user.')
      return
    }

    const payload = {
      user_id: user.id,
      page_key: 'analysis',
      name: name.trim(),
      query_text: search.trim() || null,
      saved_view_key: savedView !== 'all' ? savedView : null,
      filter_key: activeFilter !== 'all' ? activeFilter : null,
    }

    const { data, error: insertError } = await supabase
      .from('investing_saved_views')
      .insert(payload)
      .select('*')
      .single()

    if (insertError) {
      setError(insertError.message)
      return
    }

    setDbSavedViews((prev) => [...prev, data as SavedAnalysisView])
    setActiveDbSavedViewId((data as SavedAnalysisView).id)
    setSuccess(`Saved view "${name.trim()}".`)
  }

  async function handleAutoAnalyze() {
  const trimmed = autoAnalyzeTicker.trim().toUpperCase()
  if (!trimmed) return

  setAutoAnalyzeLoading(true)
  setError(null)

  try {
    const res = await fetch(
      `/investing/api/evaluate-ticker?ticker=${encodeURIComponent(trimmed)}`
    )
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.error || 'Failed to evaluate ticker.')
    }

    const snapshot = data.snapshot
    const scorecard = data.scorecard
    const verdict = data.verdict

    const valuationCat = scorecard?.categories?.find(
      (c: { id: string }) => c.id === 'valuation'
    )
    const qualityCat = scorecard?.categories?.find(
      (c: { id: string }) => c.id === 'quality'
    )
    const finHealthCat = scorecard?.categories?.find(
      (c: { id: string }) => c.id === 'financialHealth'
    )

    const autoConfidence: 'High' | 'Medium' | 'Low' =
      verdict?.label === 'Strong Buy' || verdict?.label === 'Buy'
        ? 'High'
        : verdict?.label === 'Hold'
          ? 'Medium'
          : 'Low'

    const prefilled: StockAnalysis = {
      id: '',
      user_id: null,
      ticker: snapshot.ticker,
      company: snapshot.company,
      analysis_date: getTodayDateString(),
      sector: snapshot.sector ?? 'Technology',
      moat_score: null,
      mgmt_score: null,
      biz_understanding_score: null,
      valuation_score: valuationCat?.score ?? null,
      roic_score: qualityCat?.score ?? null,
      fin_health_score: finHealthCat?.score ?? null,
      overall_score: scorecard?.overallScore ?? null,
      verdict: verdict?.label ?? null,
      confidence: autoConfidence,
      fair_value_low: snapshot.fairValueLow ?? null,
      fair_value_high: snapshot.fairValueHigh ?? null,
      thesis: null,
      thesis_breakers:
        data.redFlags
          ?.filter((rf: { triggered: boolean; severity: string }) => rf.triggered)
          .map(
            (rf: { label: string; explanation: string }) =>
              `${rf.label}: ${rf.explanation}`
          )
          .join('\n') || null,
      raw_analysis: null,
      created_at: '',
      updated_at: '',
      moat_json: null,
      management_json: null,
      moat_score_auto: null,
      management_score_auto: null,
      qualitative_confidence: null,
      qualitative_imported_at: null,
      roic_score_auto: qualityCat?.score ?? null,
      roic_score_explanation: qualityCat?.explanation ?? null,
      fin_health_score_auto: finHealthCat?.score ?? null,
      fin_health_score_explanation: finHealthCat?.explanation ?? null,
      valuation_score_auto: valuationCat?.score ?? null,
      valuation_score_explanation: valuationCat?.explanation ?? null,
      confidence_auto: autoConfidence,
      confidence_explanation: verdict?.explanation ?? null,
      verdict_auto: verdict?.label ?? null,
      verdict_explanation: verdict?.explanation ?? null,
      business_understanding_json: null,
      biz_understanding_score_auto: null,
      biz_understanding_score_explanation: null,
    }

    setEditingAnalysis(prefilled)
    setSheetOpen(true)

    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('mode', 'new')
    newUrl.searchParams.set('ticker', snapshot.ticker)
    newUrl.searchParams.set('company', snapshot.company)
    newUrl.searchParams.set('sector', snapshot.sector)
    if (snapshot.currentPrice != null) {
      newUrl.searchParams.set('current_price', String(snapshot.currentPrice))
    }
    if (snapshot.fairValueLow != null) {
      newUrl.searchParams.set('fair_value_low', String(snapshot.fairValueLow))
    }
    if (snapshot.fairValueBase != null) {
      newUrl.searchParams.set('fair_value_base', String(snapshot.fairValueBase))
    }
    if (snapshot.fairValueHigh != null) {
      newUrl.searchParams.set('fair_value_high', String(snapshot.fairValueHigh))
    }
    if (snapshot.roicTtm != null) {
      newUrl.searchParams.set('roic_ttm', String(snapshot.roicTtm))
    }
    if (snapshot.roic5yAvg != null) {
      newUrl.searchParams.set('roic_5y_avg', String(snapshot.roic5yAvg))
    }
    if (snapshot.roeTtm != null) {
      newUrl.searchParams.set('roe_ttm', String(snapshot.roeTtm))
    }
    if (snapshot.debtToEquity != null) {
      newUrl.searchParams.set('debt_to_equity', String(snapshot.debtToEquity))
    }
    if (snapshot.netDebtToEbitda != null) {
      newUrl.searchParams.set(
        'net_debt_to_ebitda',
        String(snapshot.netDebtToEbitda)
      )
    }
    if (snapshot.interestCoverage != null) {
      newUrl.searchParams.set(
        'interest_coverage',
        String(snapshot.interestCoverage)
      )
    }
    if (snapshot.currentRatio != null) {
      newUrl.searchParams.set('current_ratio', String(snapshot.currentRatio))
    }
    if (snapshot.freeCashFlowTtm != null) {
      newUrl.searchParams.set(
        'free_cash_flow_ttm',
        String(snapshot.freeCashFlowTtm)
      )
    }
    if (valuationCat?.score != null) {
      newUrl.searchParams.set('valuation_score', String(valuationCat.score))
    }
    if (qualityCat?.score != null) {
      newUrl.searchParams.set('roic_score', String(qualityCat.score))
    }
    if (finHealthCat?.score != null) {
      newUrl.searchParams.set('fin_health_score', String(finHealthCat.score))
    }
    if (scorecard?.overallScore != null) {
      newUrl.searchParams.set('overall_score', String(scorecard.overallScore))
    }
    newUrl.searchParams.set('critical_red_flags', String(data.criticalRedFlags ?? 0))
    newUrl.searchParams.set(
      'warning_red_flags',
      String(verdict?.warningRedFlags ?? 0)
    )
    window.history.replaceState(null, '', newUrl.toString())

    setAutoAnalyzeTicker('')
    setSuccess(`Engine analysis complete for ${snapshot.ticker}. Review and save.`)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Auto-analyze failed.')
  } finally {
    setAutoAnalyzeLoading(false)
  }
}

  function handleApplyDbSavedView(id: string) {
    const selected = dbSavedViews.find((view) => view.id === id)
    if (!selected) return

    setSearch(selected.query_text ?? '')
    setSavedView(selected.saved_view_key ?? 'all')
    setActiveFilter(selected.filter_key ?? 'all')
    setActiveDbSavedViewId(selected.id)
    setSuccess(`Applied saved view "${selected.name}".`)
  }

  async function handleDeleteDbSavedView(id: string) {
    const selected = dbSavedViews.find((view) => view.id === id)
    if (!selected) return

    const confirmed = window.confirm(`Delete saved view "${selected.name}"?`)
    if (!confirmed) return

    setError(null)
    setSuccess(null)

    const { error: deleteError } = await supabase
      .from('investing_saved_views')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setDbSavedViews((prev) => prev.filter((view) => view.id !== id))
    setActiveDbSavedViewId((prev) => (prev === id ? null : prev))
    setSuccess(`Deleted saved view "${selected.name}".`)
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

    const financialHealthScoreResult = runFinancialHealthScore({
      sector: payload.sector,
      debtToEquity: prefilledDebtToEquity,
      netDebtToEbitda: prefilledNetDebtToEbitda,
      interestCoverage: prefilledInterestCoverage,
      currentRatio: prefilledCurrentRatio,
      freeCashFlowTtm: prefilledFreeCashFlowTtm,
    })

    const valuationScoreResult = runValuationScore({
      currentPrice: prefilledCurrentPrice,
      fairValueLow: prefilledFairValueLow,
      fairValueBase: prefilledFairValueBase,
      fairValueHigh: prefilledFairValueHigh,
    })

    const businessUnderstandingScoreResult = runBusinessUnderstandingScore(
      payload.business_understanding_json
    )

    const effectiveValuationScore = payload.valuation_score ?? valuationScoreResult.score
    const effectiveRoicScore = payload.roic_score ?? roicScoreResult.score
    const effectiveFinancialHealthScore =
      payload.fin_health_score ?? financialHealthScoreResult.score
    const effectiveBusinessUnderstandingScore =
      payload.biz_understanding_score ?? businessUnderstandingScoreResult.score

    const scoreValues = [
      payload.moat_score,
      effectiveValuationScore,
      payload.mgmt_score,
      effectiveRoicScore,
      effectiveFinancialHealthScore,
      effectiveBusinessUnderstandingScore,
    ].filter((value): value is number => value != null)

    const overallScore =
      scoreValues.length > 0
        ? scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length
        : null

    const confidenceScoreResult = runConfidenceScore({
      overallScore,
      verdict: payload.verdict,
      fairValueLow: payload.fair_value_low,
      fairValueHigh: payload.fair_value_high,
      moatScore: payload.moat_score,
      valuationScore: effectiveValuationScore,
      managementScore: payload.mgmt_score,
      roicScore: effectiveRoicScore,
      financialHealthScore: effectiveFinancialHealthScore,
      businessUnderstandingScore: effectiveBusinessUnderstandingScore,
    })

    const verdictScoreResult = runVerdictScore({
      overallScore,
      criticalRedFlags: prefilledCriticalRedFlags,
      warningRedFlags: prefilledWarningRedFlags,
    })

    const record = {
      user_id: user?.id ?? null,
      ticker: payload.ticker,
      company: payload.company,
      analysis_date: payload.analysis_date,
      sector: payload.sector,
      moat_score: payload.moat_score,
      valuation_score: effectiveValuationScore,
      mgmt_score: payload.mgmt_score,
      roic_score: effectiveRoicScore,
      fin_health_score: effectiveFinancialHealthScore,
      biz_understanding_score: effectiveBusinessUnderstandingScore,
      overall_score: overallScore,
      verdict: payload.verdict ?? verdictScoreResult.verdict,
      fair_value_low: payload.fair_value_low,
      fair_value_high: payload.fair_value_high,
      thesis: payload.thesis,
      thesis_breakers: payload.thesis_breakers,
      confidence: payload.confidence ?? confidenceScoreResult.confidence,
      raw_analysis: payload.raw_analysis,
      moat_json: payload.moat_json,
      management_json: payload.management_json,
      moat_score_auto: payload.moat_score_auto,
      management_score_auto: payload.management_score_auto,
      qualitative_confidence: payload.qualitative_confidence,
      qualitative_imported_at:
        payload.moat_json || payload.management_json ? new Date().toISOString() : null,
      roic_score_auto: roicScoreResult.score,
      roic_score_explanation: roicScoreResult.explanation,
      valuation_score_auto: valuationScoreResult.score,
      valuation_score_explanation: valuationScoreResult.explanation,
      confidence_auto: confidenceScoreResult.confidence,
      confidence_explanation: confidenceScoreResult.explanation,
      verdict_auto: verdictScoreResult.verdict,
      verdict_explanation: verdictScoreResult.explanation,
      fin_health_score_auto: financialHealthScoreResult.score,
      fin_health_score_explanation: financialHealthScoreResult.explanation,
      business_understanding_json: businessUnderstandingScoreResult.normalizedPayload,
      biz_understanding_score_auto: businessUnderstandingScoreResult.score,
      biz_understanding_score_explanation: businessUnderstandingScoreResult.explanation,
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
<div className="ui-card p-4">
  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
    <div className="flex-1">
      <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
        Auto-Analyze a Ticker
      </label>
      <p className="mb-2 text-xs text-neutral-500 dark:text-[#a8b2bf]">
        Run the engine to auto-fill scores, fair value, red flags, and verdict. You review and adjust before saving.
      </p>
      <input
        value={autoAnalyzeTicker}
        onChange={(e) => setAutoAnalyzeTicker(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void handleAutoAnalyze()
          }
        }}
        placeholder="e.g. AAPL, MSFT, COST"
        className="ui-input max-w-xs"
        disabled={autoAnalyzeLoading}
      />
    </div>
    <button
      type="button"
      onClick={() => void handleAutoAnalyze()}
      disabled={autoAnalyzeLoading || !autoAnalyzeTicker.trim()}
      className="ui-btn-primary"
    >
      {autoAnalyzeLoading ? 'Analyzing...' : 'Auto-Analyze'}
    </button>
  </div>
</div>
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
              <DataCardRow
                label="Verdict"
                value={latestAnalysis?.verdict ?? latestAnalysis?.verdict_auto ?? '—'}
              />
              <DataCardRow
                label="Overall score"
                value={formatScore(latestAnalysis?.overall_score)}
              />
            </DataCard>

            <DataCard title="Fair Value Snapshot">
              <DataCardRow label="Low" value={formatCurrency(latestAnalysis?.fair_value_low)} />
              <DataCardRow label="High" value={formatCurrency(latestAnalysis?.fair_value_high)} />
              <DataCardRow
                label="Confidence"
                value={latestAnalysis?.confidence ?? latestAnalysis?.confidence_auto ?? '—'}
              />
            </DataCard>
          </>
        )}
      </section>

      {!loading && analyses.length > 0 ? (
        <InvestingSearchToolbar
          value={search}
          onChange={(value) => {
            setSearch(value)
            setActiveDbSavedViewId(null)
          }}
          placeholder="Search ticker, company, sector, or verdict"
          savedViews={getAnalysisSavedViews()}
          activeSavedViewKey={savedView}
          onSavedViewChange={(key) => {
            setSavedView(key)
            setActiveDbSavedViewId(null)
          }}
          filters={getAnalysisFilters()}
          activeFilterKey={activeFilter}
          onFilterChange={(key) => {
            setActiveFilter(key)
            setActiveDbSavedViewId(null)
          }}
          onClearFilters={() => {
            setSearch('')
            setSavedView('all')
            setActiveFilter('all')
            setActiveDbSavedViewId(null)
          }}
          dbSavedViews={dbSavedViews.map((view) => ({
            id: view.id,
            name: view.name,
          }))}
          activeDbSavedViewId={activeDbSavedViewId}
          onDbSavedViewChange={handleApplyDbSavedView}
          onSaveCurrentView={handleSaveCurrentDbView}
          onDeleteDbSavedView={handleDeleteDbSavedView}
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