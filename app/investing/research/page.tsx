'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { InlineStatusBanner } from '@/components/ui/InlineStatusBanner'
import { StockAnalysisForm } from '@/components/investing/StockAnalysisForm'
import type { StockAnalysisFormPayload } from '@/components/investing/StockAnalysisForm'
import type { StockAnalysis } from '@/app/investing/types'
import { runRoicScore } from '@/app/investing/lib/scoring/runRoicScore'
import { runFinancialHealthScore } from '@/app/investing/lib/scoring/runFinancialHealthScore'
import { runBusinessUnderstandingScore } from '@/app/investing/lib/scoring/runBusinessUnderstandingScore'
import { runValuationScore } from '@/app/investing/lib/scoring/runValuationScore'
import { runConfidenceScore } from '@/app/investing/lib/scoring/runConfidenceScore'
import { runVerdictScore } from '@/app/investing/lib/scoring/runVerdictScore'

type StockSearchResult = {
  ticker: string
  company: string
  sector: string
  industry: string | null
  marketCapTier: string
  exchange: string | null
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function toNullableNumber(value: string | null): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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

function createEmptyAnalysis(): StockAnalysis {
  return {
    id: '',
    user_id: null,
    ticker: '',
    company: '',
    analysis_date: getTodayDateString(),
    sector: 'Technology',
    moat_score: null,
    valuation_score: null,
    mgmt_score: null,
    roic_score: null,
    fin_health_score: null,
    biz_understanding_score: null,
    overall_score: null,
    verdict: null,
    fair_value_low: null,
    fair_value_high: null,
    thesis: null,
    thesis_breakers: null,
    confidence: null,
    raw_analysis: null,
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

function ResearchPageContent() {
const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
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

  const initialPrefill = useMemo(
    () => (queryMode === 'new' ? buildPrefilledAnalysis(searchParams) : null),
    [queryMode, searchParams]
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [analyses, setAnalyses] = useState<StockAnalysis[]>([])
  const [analysisSearch, setAnalysisSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'buy' | 'needs-review'>('all')

  const [sheetOpen, setSheetOpen] = useState(Boolean(initialPrefill))
  const [editingAnalysis, setEditingAnalysis] = useState<StockAnalysis | null>(initialPrefill)
  const [formBusy, setFormBusy] = useState(false)

  const [searchSector, setSearchSector] = useState('')
  const [searchCapTier, setSearchCapTier] = useState('')
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [autoAnalyzeTicker, setAutoAnalyzeTicker] = useState('')
  const [autoAnalyzeLoading, setAutoAnalyzeLoading] = useState(false)
  const autoAnalyzeTriggered = useRef(false)
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
      } else {
        setAnalyses((data ?? []) as StockAnalysis[])
      }

      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

useEffect(() => {
  if (queryMode === 'new' && initialPrefill && !autoAnalyzeTriggered.current) {
    setEditingAnalysis(initialPrefill)
    setSheetOpen(true)
  }
}, [queryMode, initialPrefill])

  const filteredAnalyses = useMemo(() => {
    let result = [...analyses]

    if (analysisSearch.trim()) {
      const term = analysisSearch.toLowerCase()
      result = result.filter(
        (a) =>
          a.ticker.toLowerCase().includes(term) ||
          (a.company ?? '').toLowerCase().includes(term) ||
          (a.sector ?? '').toLowerCase().includes(term)
      )
    }

    if (activeFilter === 'buy') {
      result = result.filter((a) =>
        ['Strong Buy', 'Buy'].includes(a.verdict ?? a.verdict_auto ?? '')
      )
    } else if (activeFilter === 'needs-review') {
      result = result.filter((a) =>
        ['Hold', 'Avoid', 'Red Flag'].includes(a.verdict ?? a.verdict_auto ?? '')
      )
    }

    return result
  }, [analyses, analysisSearch, activeFilter])

  async function handleStockSearch() {
    setSearching(true)
    setSearchError(null)

    try {
      const params = new URLSearchParams()
      if (searchSector) params.set('sector', searchSector)
      if (searchCapTier) params.set('marketCapTier', searchCapTier)
      if (searchText.trim()) params.set('search', searchText.trim())
      params.set('limit', '50')

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch(`/investing/api/screen-stocks?${params.toString()}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Search failed.')

      setSearchResults(json.data ?? [])
      if ((json.data ?? []).length === 0) {
        setSearchError('No stocks found. Try broadening your search.')
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed.')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleAutoAnalyzeWithTicker(tickerInput?: string) {
    const trimmed = (tickerInput || autoAnalyzeTicker).trim().toUpperCase()
    if (!trimmed) return

    setAutoAnalyzeLoading(true)
    setError(null)
    setSuccess(null)

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
            ?.filter((rf: { triggered: boolean }) => rf.triggered)
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

      autoAnalyzeTriggered.current = true
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
        newUrl.searchParams.set('net_debt_to_ebitda', String(snapshot.netDebtToEbitda))
      }
      if (snapshot.interestCoverage != null) {
        newUrl.searchParams.set('interest_coverage', String(snapshot.interestCoverage))
      }
      if (snapshot.currentRatio != null) {
        newUrl.searchParams.set('current_ratio', String(snapshot.currentRatio))
      }
      if (snapshot.freeCashFlowTtm != null) {
        newUrl.searchParams.set('free_cash_flow_ttm', String(snapshot.freeCashFlowTtm))
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

  function handleEvaluateFromSearch(ticker: string) {
    setAutoAnalyzeTicker(ticker)
    void handleAutoAnalyzeWithTicker(ticker)
  }

  function openNewAnalysis() {
    setSuccess(null)
    const base = initialPrefill ?? createEmptyAnalysis()
    setEditingAnalysis(base)
    setSheetOpen(true)
  }

  function openEditAnalysis(analysis: StockAnalysis) {
    setSuccess(null)
    setEditingAnalysis(analysis)
    setSheetOpen(true)
  }

  function closeSheet() {
    if (formBusy) return
    autoAnalyzeTriggered.current = false
    setSheetOpen(false)
    setEditingAnalysis(null)

    if (searchParams.get('mode') === 'new') {
      const next = new URL(window.location.href)
      next.searchParams.delete('mode')
      next.searchParams.delete('ticker')
      next.searchParams.delete('company')
      next.searchParams.delete('sector')
      next.searchParams.delete('current_price')
      next.searchParams.delete('fair_value_low')
      next.searchParams.delete('fair_value_base')
      next.searchParams.delete('fair_value_high')
      next.searchParams.delete('roic_ttm')
      next.searchParams.delete('roic_5y_avg')
      next.searchParams.delete('roe_ttm')
      next.searchParams.delete('debt_to_equity')
      next.searchParams.delete('net_debt_to_ebitda')
      next.searchParams.delete('interest_coverage')
      next.searchParams.delete('current_ratio')
      next.searchParams.delete('free_cash_flow_ttm')
      next.searchParams.delete('valuation_score')
      next.searchParams.delete('roic_score')
      next.searchParams.delete('fin_health_score')
      next.searchParams.delete('overall_score')
      next.searchParams.delete('critical_red_flags')
      next.searchParams.delete('warning_red_flags')
      window.history.replaceState(null, '', next.toString())
    }
  }

  async function handleDeleteAnalysis(id: string) {
    if (!confirm('Delete this analysis?')) return

    const { error: deleteError } = await supabase
      .from('investing_stock_analyses')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setAnalyses((prev) => prev.filter((a) => a.id !== id))
      setSuccess('Analysis deleted.')
    }
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

    const effectiveMoatScore = payload.moat_score ?? payload.moat_score_auto ?? null
    const effectiveMgmtScore = payload.mgmt_score ?? payload.management_score_auto ?? null

    const scoreValues = [
      effectiveMoatScore,
      effectiveValuationScore,
      effectiveMgmtScore,
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
      moatScore: effectiveMoatScore,
      valuationScore: effectiveValuationScore,
      managementScore: effectiveMgmtScore,
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
      fin_health_score_auto: financialHealthScoreResult.score,
      fin_health_score_explanation: financialHealthScoreResult.explanation,
      biz_understanding_score_auto: businessUnderstandingScoreResult.score,
      biz_understanding_score_explanation: businessUnderstandingScoreResult.explanation,
      confidence_auto: confidenceScoreResult.confidence,
      confidence_explanation: confidenceScoreResult.explanation,
      verdict_auto: verdictScoreResult.verdict,
      verdict_explanation: verdictScoreResult.explanation,
      updated_at: new Date().toISOString(),
    }

    const existingId = editingAnalysis?.id

    const response = existingId
      ? await supabase
          .from('investing_stock_analyses')
          .update(record)
          .eq('id', existingId)
          .select('*')
          .single()
      : await supabase
          .from('investing_stock_analyses')
          .insert({
            ...record,
            created_at: new Date().toISOString(),
          })
          .select('*')
          .single()

    if (response.error) {
      setError(response.error.message)
      setFormBusy(false)
      return
    }

    const saved = response.data as StockAnalysis

    setAnalyses((prev) => {
      if (existingId) {
        return prev.map((item) => (item.id === saved.id ? saved : item))
      }
      return [saved, ...prev]
    })

    setSuccess(existingId ? 'Analysis updated.' : 'Analysis saved.')
    setFormBusy(false)
    autoAnalyzeTriggered.current = false
    setSheetOpen(false)
    setEditingAnalysis(null)

    router.replace('/investing/research', { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Research
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
          Discover stocks, evaluate with the engine, and build your investment thesis.
        </p>
      </div>

      {error ? <InlineStatusBanner tone="error" message={error} /> : null}
      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          {success}
        </div>
      ) : null}

      <CollapsibleSection title="Find a stock" defaultOpen={true}>
        <div className="ui-card space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-[#a8b2bf]">
                Sector
              </label>
              <select
                value={searchSector}
                onChange={(e) => setSearchSector(e.target.value)}
                className="ui-input"
              >
                <option value="">All sectors</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Financials">Financials</option>
                <option value="Consumer Discretionary">Consumer Discretionary</option>
                <option value="Consumer Staples">Consumer Staples</option>
                <option value="Industrials">Industrials</option>
                <option value="Energy">Energy</option>
                <option value="Communication Services">Communication Services</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Utilities">Utilities</option>
                <option value="Materials">Materials</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-[#a8b2bf]">
                Market Cap
              </label>
              <select
                value={searchCapTier}
                onChange={(e) => setSearchCapTier(e.target.value)}
                className="ui-input"
              >
                <option value="">All sizes</option>
                <option value="Mega">Mega cap ($100B+)</option>
                <option value="Large">Large cap ($10B+)</option>
                <option value="Mid">Mid cap ($2B+)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-[#a8b2bf]">
                Search
              </label>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleStockSearch()
                  }
                }}
                placeholder="Ticker or company name"
                className="ui-input"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void handleStockSearch()}
                disabled={searching}
                className="ui-btn-primary w-full"
              >
                {searching ? 'Searching...' : 'Search Stocks'}
              </button>
            </div>
          </div>

          {searchError ? (
            <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {searchError}
            </div>
          ) : null}

          {searchResults.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-neutral-700 dark:text-[#c8cdd4]">
                {searchResults.length} stocks found
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {searchResults.map((stock) => (
                  <div
                    key={stock.ticker}
                    className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                        {stock.ticker}
                        <span className="ml-2 font-normal text-neutral-600 dark:text-[#a8b2bf]">
                          {stock.company}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                        {stock.sector}
                        {stock.industry ? ` · ${stock.industry}` : ''}
                        {` · ${stock.marketCapTier} cap`}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleEvaluateFromSearch(stock.ticker)}
                        className="ui-btn-primary px-3 py-1 text-xs"
                      >
                        Evaluate
                      </button>
                      <Link
                        href={`/investing/watchlist?mode=new&ticker=${encodeURIComponent(stock.ticker)}&company=${encodeURIComponent(stock.company)}&sector=${encodeURIComponent(stock.sector)}`}
                        className="ui-btn-secondary px-3 py-1 text-xs"
                      >
                        + Watchlist
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </CollapsibleSection>

      <div className="ui-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
              Evaluate a ticker
            </label>
            <input
              value={autoAnalyzeTicker}
              onChange={(e) => setAutoAnalyzeTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleAutoAnalyzeWithTicker()
                }
              }}
              placeholder="e.g. AAPL, MSFT, COST"
              className="ui-input max-w-xs"
              disabled={autoAnalyzeLoading}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleAutoAnalyzeWithTicker()}
            disabled={autoAnalyzeLoading || !autoAnalyzeTicker.trim()}
            className="ui-btn-primary"
          >
            {autoAnalyzeLoading ? 'Evaluating...' : 'Evaluate'}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            Your analyses
          </h2>
          <button
            type="button"
            onClick={openNewAnalysis}
            className="ui-btn-secondary text-sm"
          >
            New analysis
          </button>
        </div>

        <div className="mb-4 space-y-3">
          <input
            value={analysisSearch}
            onChange={(e) => setAnalysisSearch(e.target.value)}
            placeholder="Search ticker, company, or sector"
            className="ui-input w-full"
          />
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'buy', label: 'Buy / Strong Buy' },
              { key: 'needs-review', label: 'Needs Review' },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() =>
                  setActiveFilter(filter.key as 'all' | 'buy' | 'needs-review')
                }
                className={
                  activeFilter === filter.key ? 'ui-link-pill-active' : 'ui-link-pill-idle'
                }
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800"
              />
            ))}
          </div>
        ) : filteredAnalyses.length === 0 ? (
          <div className="ui-card p-6 text-center text-sm text-neutral-500 dark:text-[#a8b2bf]">
            {analyses.length === 0
              ? 'No analyses yet. Use "Find a stock" above or type a ticker to evaluate.'
              : 'No analyses match your search or filter.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnalyses.map((analysis) => {
              const effectiveVerdict = analysis.verdict ?? analysis.verdict_auto ?? ''
              const verdictClass = ['Strong Buy', 'Buy'].includes(effectiveVerdict)
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : effectiveVerdict === 'Hold'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'

              return (
                <div key={analysis.id} className="ui-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900 dark:text-[#e6eaf0]">
                          {analysis.ticker}
                        </span>
                        <span className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                          {analysis.company}
                        </span>
                        {effectiveVerdict ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${verdictClass}`}
                          >
                            {effectiveVerdict}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                        {analysis.sector} · {formatDate(analysis.analysis_date)}
                        {analysis.overall_score != null
                          ? ` · Score: ${analysis.overall_score.toFixed(1)}`
                          : ''}
                        {analysis.fair_value_low != null && analysis.fair_value_high != null
                          ? ` · FV: $${analysis.fair_value_low.toFixed(0)}–$${analysis.fair_value_high.toFixed(0)}`
                          : ''}
                      </div>
                      {analysis.thesis ? (
                        <div className="mt-1 line-clamp-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                          {analysis.thesis}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditAnalysis(analysis)}
                        className="ui-btn-secondary px-3 py-1 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAnalysis(analysis.id)}
                        className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                      <Link
                        href={`/investing/watchlist?mode=new&ticker=${encodeURIComponent(analysis.ticker)}&company=${encodeURIComponent(analysis.company ?? '')}&sector=${encodeURIComponent((analysis.sector as string) ?? '')}&fair_value_low=${analysis.fair_value_low ?? ''}&fair_value_high=${analysis.fair_value_high ?? ''}&scorecard_overall=${analysis.overall_score ?? ''}&target_entry=${analysis.fair_value_low ?? ''}`}
                        className="ui-btn-secondary px-3 py-1 text-xs"
                      >
                        → Watchlist
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingAnalysis?.id ? 'Edit analysis' : 'Add analysis'}
      >
        <StockAnalysisForm
          initialAnalysis={editingAnalysis}
          onSubmit={handleSaveAnalysis}
          onCancel={closeSheet}
          submitLabel={editingAnalysis?.id ? 'Update analysis' : 'Add analysis'}
          busy={formBusy}
        />
      </BottomSheet>
    </div>
  )
}

export default function ResearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Loading...</div>}>
      <ResearchPageContent />
    </Suspense>
  )
}