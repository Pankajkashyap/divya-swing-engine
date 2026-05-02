'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type {
  BucketTarget,
  DecisionJournalEntry,
  Holding,
  SectorTarget,
  StockAnalysis,
} from '@/app/investing/types'
import {
  calculatePositionSize,
  type PositionSizingResult,
} from '@/app/investing/lib/positionSizing'
import {
  runAllSellSignals,
  type SellSignal,
  type SellSignalInput,
} from '@/app/investing/lib/sellSignals'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { InlineStatusBanner } from '@/components/ui/InlineStatusBanner'
import { InvestingPageHeader } from '@/components/investing/InvestingPageHeader'
import { InvestingSearchToolbar } from '@/components/investing/InvestingSearchToolbar'
import { HoldingForm } from '@/components/investing/HoldingForm'
import { HoldingsTable } from '@/components/investing/HoldingsTable'
import { HoldingsCardList } from '@/components/investing/HoldingsCardList'
import { DecisionJournalForm } from '@/components/investing/DecisionJournalForm'

type EnrichedHolding = Holding & {
  latest_analysis_overall_score?: number | null
  latest_analysis_verdict?: StockAnalysis['verdict'] | null
  latest_analysis_confidence?: StockAnalysis['confidence'] | string | null
  latest_analysis_fair_value_low?: number | null
  latest_analysis_fair_value_high?: number | null
  latest_analysis_date?: string | null
  valuation_status?: 'Below fair value' | 'Within range' | 'Above fair value' | null
  portfolio_action_hint?: 'Add candidate' | 'Hold' | 'Trim candidate' | 'Review thesis' | null
}

type SectorExposureRow = {
  sector: string
  marketValue: number
  pct: number
  targetMin: number | null
  targetMax: number | null
}

type BucketExposureRow = {
  bucket: string
  marketValue: number
  pct: number
  target: number | null
  targetMin: number | null
  targetMax: number | null
}

type RebalanceAlert = {
  category: 'sector' | 'bucket' | 'portfolio'
  name: string
  status: 'overweight' | 'underweight' | 'cash_low' | 'position_concentrated'
  currentPct: number
  targetMinPct: number | null
  targetMaxPct: number | null
  deviationPct: number
  suggestion: string
}

type HoldingFormPayload = {
  ticker: string
  company: string
  account: Holding['account']
  base_currency: string
  sector: string
  shares: number
  avg_cost: number
  current_price: number
  thesis: string | null
  thesis_breakers: string | null
  thesis_status: Holding['thesis_status']
  date_bought: string | null
  bucket: Holding['bucket']
}

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

type SavedPortfolioView = {
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
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

function getSectorStatus(pct: number, min: number | null, max: number | null) {
  if (min == null || max == null) return null
  if (pct < min) return { label: 'Under', color: 'text-amber-600 dark:text-amber-400' }
  if (pct > max) return { label: 'Over', color: 'text-red-600 dark:text-red-400' }
  return { label: 'In range', color: 'text-emerald-600 dark:text-emerald-400' }
}

function getPortfolioSavedViews() {
  return [
    { key: 'all', label: 'All' },
    { key: 'risk-review', label: 'Risk Review' },
    { key: 'add-candidates', label: 'Add Candidates' },
    { key: 'tfsa-only', label: 'TFSA Only' },
  ]
}

function getPortfolioFilters() {
  return [
    { key: 'all', label: 'All Filters' },
    { key: 'review-thesis', label: 'Review Thesis' },
    { key: 'trim-candidate', label: 'Trim Candidate' },
    { key: 'high-confidence', label: 'High Confidence' },
  ]
}

function getValuationStatus(args: {
  currentPrice: number | null | undefined
  fairValueLow: number | null | undefined
  fairValueHigh: number | null | undefined
}): 'Below fair value' | 'Within range' | 'Above fair value' | null {
  const { currentPrice, fairValueLow, fairValueHigh } = args

  if (
    currentPrice == null ||
    !Number.isFinite(currentPrice) ||
    fairValueLow == null ||
    !Number.isFinite(fairValueLow) ||
    fairValueHigh == null ||
    !Number.isFinite(fairValueHigh)
  ) {
    return null
  }

  if (currentPrice < fairValueLow) return 'Below fair value'
  if (currentPrice > fairValueHigh) return 'Above fair value'
  return 'Within range'
}

function getPortfolioActionHint(args: {
  latestVerdict: StockAnalysis['verdict'] | null | undefined
  latestConfidence: StockAnalysis['confidence'] | string | null | undefined
  valuationStatus: 'Below fair value' | 'Within range' | 'Above fair value' | null | undefined
  thesisStatus: Holding['thesis_status'] | null | undefined
}): 'Add candidate' | 'Hold' | 'Trim candidate' | 'Review thesis' | null {
  const { latestVerdict, latestConfidence, valuationStatus, thesisStatus } = args

  if (thesisStatus === 'Broken' || thesisStatus === 'Weakening') {
    return 'Review thesis'
  }

  if (
    (latestVerdict === 'Strong Buy' || latestVerdict === 'Buy') &&
    valuationStatus === 'Below fair value' &&
    latestConfidence !== 'Low'
  ) {
    return 'Add candidate'
  }

  if (
    valuationStatus === 'Above fair value' &&
    (latestVerdict === 'Hold' || latestVerdict === 'Avoid' || latestVerdict === 'Red Flag')
  ) {
    return 'Trim candidate'
  }

  return 'Hold'
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

function buildPrefilledHolding(searchParams: URLSearchParams): EnrichedHolding | null {
  const ticker = searchParams.get('ticker')?.trim().toUpperCase() ?? ''
  if (!ticker) return null

  const shares = toNullableNumber(searchParams.get('shares')) ?? 0
  const avgCost = toNullableNumber(searchParams.get('avg_cost')) ?? 0
  const currentPrice = toNullableNumber(searchParams.get('current_price')) ?? 0

  return {
    id: '',
    user_id: null,
    ticker,
    company: searchParams.get('company')?.trim() ?? ticker,
    account:
      (searchParams.get('account')?.trim() as Holding['account'] | null) ?? 'TFSA',
    base_currency: searchParams.get('base_currency')?.trim() ?? 'USD',
    sector: searchParams.get('sector')?.trim() ?? '',
    shares,
    avg_cost: avgCost,
    current_price: currentPrice,
    market_value: shares * currentPrice,
    gain_loss_pct: avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : null,
    thesis: searchParams.get('thesis')?.trim() || null,
    thesis_breakers: searchParams.get('thesis_breakers')?.trim() || null,
    thesis_status:
      (searchParams.get('thesis_status')?.trim() as Holding['thesis_status'] | null) ??
      'Intact',
    date_bought: searchParams.get('date_bought')?.trim() || null,
    bucket:
      (searchParams.get('bucket')?.trim() as Holding['bucket'] | null) ??
      'Core compounder',
    created_at: '',
    updated_at: '',
    latest_analysis_overall_score: null,
    latest_analysis_verdict: null,
    latest_analysis_confidence: null,
    latest_analysis_fair_value_low: null,
    latest_analysis_fair_value_high: null,
    latest_analysis_date: null,
    valuation_status: null,
    portfolio_action_hint: null,
  }
}

function holdingToJournalSeed(holding: Holding): DecisionJournalEntry {
  return {
    id: '',
    user_id: null,
    entry_number: 0,
    entry_date: getTodayDateString(),
    ticker: holding.ticker,
    account: holding.account,
    action: 'HOLD',
    shares: holding.shares,
    price: holding.current_price,
    portfolio_weight_after: null,
    reasoning: holding.thesis ?? null,
    emotional_state: null,
    scorecard_overall: null,
    framework_supported: null,
    three_month_review: null,
    twelve_month_review: null,
    review_due_3m: null,
    review_due_12m: null,
    created_at: '',
  }
}

function InvestingPortfolioPageContent() {
const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const queryMode = searchParams.get('mode')
  const queryPrefillHolding = useMemo(
    () => (queryMode === 'new' ? buildPrefilledHolding(searchParams) : null),
    [queryMode, searchParams]
  )

  const [holdings, setHoldings] = useState<EnrichedHolding[]>([])
  const [analyses, setAnalyses] = useState<StockAnalysis[]>([])
  const [dbSavedViews, setDbSavedViews] = useState<SavedPortfolioView[]>([])
  const [activeDbSavedViewId, setActiveDbSavedViewId] = useState<string | null>(null)

  const [sectorTargets, setSectorTargets] = useState<SectorTarget[]>([])
  const [bucketTargets, setBucketTargets] = useState<BucketTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [journalEntryCount, setJournalEntryCount] = useState(0)
  const [overdueReviewCount, setOverdueReviewCount] = useState(0)
  const [recentEntryDate, setRecentEntryDate] = useState<string | null>(null)

  const [sizerTicker, setSizerTicker] = useState('')
  const [sizerConfidence, setSizerConfidence] = useState<'High' | 'Medium' | 'Low'>('Medium')
  const [sizerSector, setSizerSector] = useState('')
  const [sizerBucket, setSizerBucket] = useState<string>('Core compounder')
  const [sizerPrice, setSizerPrice] = useState('')
  const [sizerResult, setSizerResult] = useState<PositionSizingResult | null>(null)

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
    () => queryMode === 'new' && !!buildPrefilledHolding(searchParams)
  )
  const [editingHolding, setEditingHolding] = useState<EnrichedHolding | null>(
    () => (queryMode === 'new' ? buildPrefilledHolding(searchParams) : null)
  )
  const [formBusy, setFormBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [journalSheetOpen, setJournalSheetOpen] = useState(false)
  const [journalHolding, setJournalHolding] = useState<EnrichedHolding | null>(null)
  const [journalBusy, setJournalBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

const [
  holdingsRes,
  sectorTargetsRes,
  bucketTargetsRes,
  analysesRes,
  savedViewsRes,
  journalRes,
] = await Promise.all([
  supabase
    .from('investing_holdings')
    .select('*')
    .order('market_value', { ascending: false }),
  supabase
    .from('investing_sector_targets')
    .select('*')
    .order('sector', { ascending: true }),
  supabase
    .from('investing_bucket_targets')
    .select('*')
    .order('bucket', { ascending: true }),
  supabase
    .from('investing_stock_analyses')
    .select('*')
    .order('analysis_date', { ascending: false }),
  user?.id
    ? supabase
        .from('investing_saved_views')
        .select('*')
        .eq('user_id', user.id)
        .eq('page_key', 'portfolio')
        .order('created_at', { ascending: true })
    : Promise.resolve({ data: [], error: null }),
  user?.id
    ? supabase
        .from('investing_decision_journal')
        .select(
          'id, review_due_3m, review_due_12m, three_month_review, twelve_month_review, created_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: [], error: null }),
])

      if (cancelled) return

      const errors: string[] = []

      if (sectorTargetsRes.error) {
        errors.push(`Sector targets: ${sectorTargetsRes.error.message}`)
      } else {
        setSectorTargets((sectorTargetsRes.data ?? []) as SectorTarget[])
      }

      if (bucketTargetsRes.error) {
        errors.push(`Bucket targets: ${bucketTargetsRes.error.message}`)
      } else {
        setBucketTargets((bucketTargetsRes.data ?? []) as BucketTarget[])
      }

      if (holdingsRes.error) {
        errors.push(`Holdings: ${holdingsRes.error.message}`)
      }

      if (analysesRes.error) {
        errors.push(`Analyses: ${analysesRes.error.message}`)
      } else {
        setAnalyses((analysesRes.data ?? []) as StockAnalysis[])
      }

      if (!holdingsRes.error && !analysesRes.error) {
        const latestAnalysisByTicker = new Map<string, StockAnalysis>()

        for (const analysis of (analysesRes.data ?? []) as StockAnalysis[]) {
          const ticker = analysis.ticker?.toUpperCase?.() ?? ''
          if (!ticker) continue

          if (!latestAnalysisByTicker.has(ticker)) {
            latestAnalysisByTicker.set(ticker, analysis)
          }
        }

        const enrichedHoldings: EnrichedHolding[] = ((holdingsRes.data ?? []) as Holding[]).map(
          (item) => {
            const latestAnalysis = latestAnalysisByTicker.get(item.ticker.toUpperCase())
            const latestFairValueLow = latestAnalysis?.fair_value_low ?? null
            const latestFairValueHigh = latestAnalysis?.fair_value_high ?? null
            const latestVerdict = latestAnalysis?.verdict ?? latestAnalysis?.verdict_auto ?? null
            const latestConfidence =
              latestAnalysis?.confidence ?? latestAnalysis?.confidence_auto ?? null
            const valuationStatus = getValuationStatus({
              currentPrice: item.current_price,
              fairValueLow: latestFairValueLow,
              fairValueHigh: latestFairValueHigh,
            })

            return {
              ...item,
              latest_analysis_overall_score: latestAnalysis?.overall_score ?? null,
              latest_analysis_verdict: latestVerdict,
              latest_analysis_confidence: latestConfidence,
              latest_analysis_fair_value_low: latestFairValueLow,
              latest_analysis_fair_value_high: latestFairValueHigh,
              latest_analysis_date: latestAnalysis?.analysis_date ?? null,
              valuation_status: valuationStatus,
              portfolio_action_hint: getPortfolioActionHint({
                latestVerdict,
                latestConfidence,
                valuationStatus,
                thesisStatus: item.thesis_status,
              }),
            }
          }
        )

        setHoldings(enrichedHoldings)
      }

      setDbSavedViews((savedViewsRes.data ?? []) as SavedPortfolioView[])

      if (!journalRes.error && journalRes.data) {
        setJournalEntryCount(journalRes.data.length)

        const today = new Date().toISOString().slice(0, 10)
        const overdue = journalRes.data.filter(
          (e) =>
            (e.review_due_3m && e.review_due_3m <= today && !e.three_month_review) ||
            (e.review_due_12m && e.review_due_12m <= today && !e.twelve_month_review)
        ).length

        setOverdueReviewCount(overdue)

        if (journalRes.data.length > 0) {
          setRecentEntryDate(journalRes.data[0].created_at?.slice(0, 10) ?? null)
        } else {
          setRecentEntryDate(null)
        }
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

  const summary = useMemo(() => {
    const totalValue = holdings.reduce((sum, holding) => sum + Number(holding.market_value ?? 0), 0)

    const equityHoldings = holdings.filter(
      (h) => h.bucket !== 'TFSA Cash' && h.bucket !== 'Non-registered Cash'
    )

    const equityValue = equityHoldings.reduce(
      (sum, holding) => sum + Number(holding.market_value ?? 0),
      0
    )

    const totalGainLosspctWeighted =
      equityValue > 0
        ? equityHoldings.reduce((sum, holding) => {
            const marketValue = Number(holding.market_value ?? 0)
            const gainLossPct = Number(holding.gain_loss_pct ?? 0)
            return sum + (marketValue / equityValue) * gainLossPct
          }, 0)
        : 0

    const cashValue = holdings
      .filter(
        (holding) =>
          holding.bucket === 'TFSA Cash' || holding.bucket === 'Non-registered Cash'
      )
      .reduce((sum, holding) => sum + Number(holding.market_value ?? 0), 0)

    const tfsaValue = holdings
      .filter((holding) => holding.account === 'TFSA')
      .reduce((sum, holding) => sum + Number(holding.market_value ?? 0), 0)

    const nonRegisteredValue = holdings
      .filter((holding) => holding.account === 'Non-registered')
      .reduce((sum, holding) => sum + Number(holding.market_value ?? 0), 0)

    return {
      totalValue,
      holdingsCount: holdings.length,
      weightedGainLossPct: totalGainLosspctWeighted,
      cashValue,
      tfsaValue,
      nonRegisteredValue,
    }
  }, [holdings])

  const sectorExposure = useMemo<SectorExposureRow[]>(() => {
    const totalValue = summary.totalValue
    const map = new Map<string, number>()

    const equityHoldings = holdings.filter(
      (h) => h.bucket !== 'TFSA Cash' && h.bucket !== 'Non-registered Cash'
    )

    for (const holding of equityHoldings) {
      const sector = holding.sector || 'Unassigned'
      const marketValue = Number(holding.market_value ?? 0)
      map.set(sector, (map.get(sector) ?? 0) + marketValue)
    }

    return Array.from(map.entries())
      .map(([sector, marketValue]) => {
        const target = sectorTargets.find((row) => row.sector === sector)
        return {
          sector,
          marketValue,
          pct: totalValue > 0 ? (marketValue / totalValue) * 100 : 0,
          targetMin: target?.min_pct ?? null,
          targetMax: target?.max_pct ?? null,
        }
      })
      .sort((a, b) => b.marketValue - a.marketValue)
  }, [holdings, sectorTargets, summary.totalValue])

  const bucketExposure = useMemo<BucketExposureRow[]>(() => {
    const totalValue = summary.totalValue
    const map = new Map<string, number>()

    for (const holding of holdings) {
      const bucket = holding.bucket || 'Unassigned'
      const marketValue = Number(holding.market_value ?? 0)
      map.set(bucket, (map.get(bucket) ?? 0) + marketValue)
    }

    return Array.from(map.entries())
      .map(([bucket, marketValue]) => {
        const target = bucketTargets.find((row) => row.bucket === bucket)
        return {
          bucket,
          marketValue,
          pct: totalValue > 0 ? (marketValue / totalValue) * 100 : 0,
          target: target?.target_pct ?? null,
          targetMin: target?.min_pct ?? null,
          targetMax: target?.max_pct ?? null,
        }
      })
      .sort((a, b) => b.marketValue - a.marketValue)
  }, [holdings, bucketTargets, summary.totalValue])

  const filteredHoldings = useMemo(() => {
    const term = search.trim().toLowerCase()

    let result = holdings.filter((holding) => {
      if (!term) return true

      return (
        holding.ticker.toLowerCase().includes(term) ||
        holding.company.toLowerCase().includes(term) ||
        holding.sector.toLowerCase().includes(term) ||
        holding.account.toLowerCase().includes(term) ||
        (holding.bucket ?? '').toLowerCase().includes(term) ||
        (holding.latest_analysis_verdict ?? '').toLowerCase().includes(term) ||
        (holding.portfolio_action_hint ?? '').toLowerCase().includes(term) ||
        (holding.thesis_status ?? '').toLowerCase().includes(term)
      )
    })

    if (savedView === 'risk-review') {
      result = result.filter(
        (holding) =>
          holding.portfolio_action_hint === 'Review thesis' ||
          holding.portfolio_action_hint === 'Trim candidate'
      )
    }

    if (savedView === 'add-candidates') {
      result = result.filter((holding) => holding.portfolio_action_hint === 'Add candidate')
    }

    if (savedView === 'tfsa-only') {
      result = result.filter((holding) => holding.account === 'TFSA')
    }

    if (activeFilter === 'review-thesis') {
      result = result.filter((holding) => holding.portfolio_action_hint === 'Review thesis')
    }

    if (activeFilter === 'trim-candidate') {
      result = result.filter((holding) => holding.portfolio_action_hint === 'Trim candidate')
    }

    if (activeFilter === 'high-confidence') {
      result = result.filter((holding) => holding.latest_analysis_confidence === 'High')
    }

    return result
  }, [holdings, search, savedView, activeFilter])

  const topHoldings = useMemo(() => holdings.slice(0, 5), [holdings])

  const sellSignals = useMemo<SellSignal[]>(() => {
    const totalPortfolioValue = holdings.reduce(
      (sum, h) => sum + Number(h.market_value ?? 0),
      0
    )
    if (totalPortfolioValue === 0) return []

    const sectorTotals = new Map<string, number>()
    const bucketTotals = new Map<string, number>()

    for (const h of holdings) {
      if (h.bucket === 'TFSA Cash' || h.bucket === 'Non-registered Cash') continue

      const sector = h.sector || 'Unassigned'
      sectorTotals.set(sector, (sectorTotals.get(sector) ?? 0) + Number(h.market_value ?? 0))

      const bucket = h.bucket || 'Unassigned'
      bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + Number(h.market_value ?? 0))
    }

    const inputs: SellSignalInput[] = holdings.map((h) => {
      const marketValue = Number(h.market_value ?? 0)
      const sectorTarget = sectorTargets.find((t) => t.sector === h.sector)
      const bucketTarget = bucketTargets.find((t) => t.bucket === h.bucket)

      const latestAnalysis = analyses.find(
        (a) => a.ticker.toUpperCase() === h.ticker.toUpperCase()
      )

      return {
        ticker: h.ticker,
        company: h.company,
        shares: h.shares,
        avgCost: h.avg_cost,
        currentPrice: h.current_price,
        marketValue: h.market_value,
        gainLossPct: h.gain_loss_pct,
        sector: h.sector || 'Unassigned',
        bucket: h.bucket,
        thesisStatus: h.thesis_status,
        latestVerdict: latestAnalysis?.verdict ?? latestAnalysis?.verdict_auto ?? null,
        latestConfidence:
          latestAnalysis?.confidence ?? latestAnalysis?.confidence_auto ?? null,
        fairValueLow: latestAnalysis?.fair_value_low ?? null,
        fairValueHigh: latestAnalysis?.fair_value_high ?? null,
        positionWeightPct:
          totalPortfolioValue > 0 ? (marketValue / totalPortfolioValue) * 100 : 0,
        sectorWeightPct:
          totalPortfolioValue > 0
            ? ((sectorTotals.get(h.sector || 'Unassigned') ?? 0) / totalPortfolioValue) * 100
            : 0,
        sectorTargetMaxPct: sectorTarget?.max_pct ?? null,
        bucketWeightPct:
          totalPortfolioValue > 0
            ? ((bucketTotals.get(h.bucket || 'Unassigned') ?? 0) / totalPortfolioValue) * 100
            : 0,
        bucketTargetMaxPct: bucketTarget?.max_pct ?? null,
      }
    })

    return runAllSellSignals(inputs)
  }, [holdings, sectorTargets, bucketTargets, analyses])

  const rebalanceAlerts = useMemo<RebalanceAlert[]>(() => {
    const alerts: RebalanceAlert[] = []

    for (const row of sectorExposure) {
      if (row.targetMax != null && row.pct > row.targetMax) {
        alerts.push({
          category: 'sector',
          name: row.sector,
          status: 'overweight',
          currentPct: row.pct,
          targetMinPct: row.targetMin,
          targetMaxPct: row.targetMax,
          deviationPct: row.pct - row.targetMax,
          suggestion: `Trim ${row.sector} holdings by ~$${(
            row.marketValue - summary.totalValue * (row.targetMax / 100)
          ).toLocaleString('en-US', { maximumFractionDigits: 0 })} to reach ${row.targetMax}% target max.`,
        })
      }

      if (row.targetMin != null && row.pct < row.targetMin && row.pct > 0) {
        alerts.push({
          category: 'sector',
          name: row.sector,
          status: 'underweight',
          currentPct: row.pct,
          targetMinPct: row.targetMin,
          targetMaxPct: row.targetMax,
          deviationPct: row.targetMin - row.pct,
          suggestion: `Add ~$${(
            summary.totalValue * (row.targetMin / 100) - row.marketValue
          ).toLocaleString('en-US', { maximumFractionDigits: 0 })} to ${row.sector} to reach ${row.targetMin}% target min.`,
        })
      }
    }

    for (const row of bucketExposure) {
      if (row.bucket === 'TFSA Cash' || row.bucket === 'Non-registered Cash') continue

      if (row.targetMax != null && row.pct > row.targetMax) {
        alerts.push({
          category: 'bucket',
          name: row.bucket,
          status: 'overweight',
          currentPct: row.pct,
          targetMinPct: row.targetMin,
          targetMaxPct: row.targetMax,
          deviationPct: row.pct - row.targetMax,
          suggestion: `Trim ${row.bucket} bucket by ~$${(
            row.marketValue - summary.totalValue * (row.targetMax / 100)
          ).toLocaleString('en-US', { maximumFractionDigits: 0 })} to reach ${row.targetMax}% target max.`,
        })
      }

      if (row.targetMin != null && row.pct < row.targetMin && row.pct > 0) {
        alerts.push({
          category: 'bucket',
          name: row.bucket,
          status: 'underweight',
          currentPct: row.pct,
          targetMinPct: row.targetMin,
          targetMaxPct: row.targetMax,
          deviationPct: row.targetMin - row.pct,
          suggestion: `Add ~$${(
            summary.totalValue * (row.targetMin / 100) - row.marketValue
          ).toLocaleString('en-US', { maximumFractionDigits: 0 })} to ${row.bucket} to reach ${row.targetMin}% target min.`,
        })
      }
    }

    const cashPct = summary.totalValue > 0 ? (summary.cashValue / summary.totalValue) * 100 : 0
    if (cashPct < 5 && summary.totalValue > 0) {
      alerts.push({
        category: 'portfolio',
        name: 'Cash reserves',
        status: 'cash_low',
        currentPct: cashPct,
        targetMinPct: 5,
        targetMaxPct: null,
        deviationPct: 5 - cashPct,
        suggestion: `Cash is ${cashPct.toFixed(1)}% of portfolio. Add ~$${(
          summary.totalValue * 0.05 - summary.cashValue
        ).toLocaleString('en-US', { maximumFractionDigits: 0 })} to reach 5% minimum.`,
      })
    }

    for (const h of holdings) {
      if (h.bucket === 'TFSA Cash' || h.bucket === 'Non-registered Cash') continue

      const weight =
        summary.totalValue > 0 ? (Number(h.market_value ?? 0) / summary.totalValue) * 100 : 0

      if (weight > 12) {
        alerts.push({
          category: 'portfolio',
          name: h.ticker,
          status: 'position_concentrated',
          currentPct: weight,
          targetMinPct: null,
          targetMaxPct: 10,
          deviationPct: weight - 10,
          suggestion: `${h.ticker} is ${weight.toFixed(1)}% of portfolio. Trim ~$${(
            Number(h.market_value ?? 0) - summary.totalValue * 0.1
          ).toLocaleString('en-US', { maximumFractionDigits: 0 })} to bring below 10%.`,
        })
      }
    }

    return alerts.sort((a, b) => b.deviationPct - a.deviationPct)
  }, [sectorExposure, bucketExposure, holdings, summary])

  function handleComputePositionSize() {
    const price = parseFloat(sizerPrice)
    if (!sizerTicker.trim() || !price || price <= 0) return

    const totalPortfolioValue = holdings.reduce(
      (sum, h) => sum + Number(h.market_value ?? 0),
      0
    )
    const currentCashValue = holdings
      .filter(
        (h) => h.bucket === 'TFSA Cash' || h.bucket === 'Non-registered Cash'
      )
      .reduce((sum, h) => sum + Number(h.market_value ?? 0), 0)

    const existingHolding = holdings.find(
      (h) => h.ticker.toUpperCase() === sizerTicker.trim().toUpperCase()
    )
    const existingPositionValue = existingHolding
      ? Number(existingHolding.market_value ?? 0)
      : 0

    const currentSectorValue = holdings
      .filter(
        (h) =>
          h.sector === sizerSector &&
          h.bucket !== 'TFSA Cash' &&
          h.bucket !== 'Non-registered Cash'
      )
      .reduce((sum, h) => sum + Number(h.market_value ?? 0), 0)

    const sectorTarget = sectorTargets.find((t) => t.sector === sizerSector)

    const currentBucketValue = holdings
      .filter((h) => h.bucket === sizerBucket)
      .reduce((sum, h) => sum + Number(h.market_value ?? 0), 0)

    const bucketTarget = bucketTargets.find((t) => t.bucket === sizerBucket)

    const result = calculatePositionSize({
      ticker: sizerTicker.trim().toUpperCase(),
      currentPrice: price,
      confidence: sizerConfidence,
      sector: sizerSector,
      bucket: sizerBucket,
      totalPortfolioValue,
      currentCashValue,
      existingPositionValue,
      currentSectorValue,
      sectorTargetMaxPct: sectorTarget?.max_pct ?? null,
      currentBucketValue,
      bucketTargetMaxPct: bucketTarget?.max_pct ?? null,
    })

    setSizerResult(result)
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
      page_key: 'portfolio',
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

    setDbSavedViews((prev) => [...prev, data as SavedPortfolioView])
    setActiveDbSavedViewId((data as SavedPortfolioView).id)
    setSuccess(`Saved view "${name.trim()}".`)
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

  function openAddSheet() {
    setSuccess(null)
    setEditingHolding(queryPrefillHolding)
    setSheetOpen(true)
  }

  function openEditSheet(holding: EnrichedHolding) {
    setSuccess(null)
    setEditingHolding(holding)
    setSheetOpen(true)
  }

  function closeSheet() {
    if (formBusy) return
    setSheetOpen(false)
    setEditingHolding(null)
  }

  function openJournalSheet(holding: EnrichedHolding) {
    setSuccess(null)
    setJournalHolding(holding)
    setJournalSheetOpen(true)
  }

  function closeJournalSheet() {
    if (journalBusy) return
    setJournalSheetOpen(false)
    setJournalHolding(null)
  }

  async function handleSaveHolding(payload: HoldingFormPayload) {
    setFormBusy(true)
    setError(null)
    setSuccess(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const record = {
      user_id: user?.id ?? null,
      ticker: payload.ticker,
      company: payload.company,
      account: payload.account,
      base_currency: payload.base_currency,
      sector: payload.sector,
      shares: payload.shares,
      avg_cost: payload.avg_cost,
      current_price: payload.current_price,
      thesis: payload.thesis,
      thesis_breakers: payload.thesis_breakers,
      thesis_status: payload.thesis_status,
      date_bought: payload.date_bought,
      bucket: payload.bucket,
    }

    if (editingHolding && editingHolding.id) {
      const { error: updateError } = await supabase
        .from('investing_holdings')
        .update(record)
        .eq('id', editingHolding.id)

      if (updateError) {
        setError(updateError.message)
        setFormBusy(false)
        return
      }

      setHoldings((prev) =>
        prev
          .map((holding) => {
            if (holding.id !== editingHolding.id) return holding

            const valuationStatus = getValuationStatus({
              currentPrice: payload.current_price,
              fairValueLow: holding.latest_analysis_fair_value_low ?? null,
              fairValueHigh: holding.latest_analysis_fair_value_high ?? null,
            })

            return {
              ...holding,
              ...record,
              market_value: payload.shares * payload.current_price,
              gain_loss_pct:
                payload.avg_cost > 0
                  ? ((payload.current_price - payload.avg_cost) / payload.avg_cost) * 100
                  : null,
              valuation_status: valuationStatus,
              portfolio_action_hint: getPortfolioActionHint({
                latestVerdict: holding.latest_analysis_verdict ?? null,
                latestConfidence: holding.latest_analysis_confidence ?? null,
                valuationStatus,
                thesisStatus: payload.thesis_status,
              }),
            }
          })
          .sort(
            (a, b) =>
              Number(b.market_value ?? b.shares * b.current_price) -
              Number(a.market_value ?? a.shares * a.current_price)
          )
      )

      setSuccess(`Updated ${payload.ticker} holding.`)
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('investing_holdings')
        .insert(record)
        .select('*')
        .single()

      if (insertError) {
        setError(insertError.message)
        setFormBusy(false)
        return
      }

      setHoldings((prev) =>
        [inserted as EnrichedHolding, ...prev].sort(
          (a, b) => Number(b.market_value ?? 0) - Number(a.market_value ?? 0)
        )
      )

      setSuccess(`Added ${payload.ticker} holding.`)
    }

    setFormBusy(false)
    setSheetOpen(false)
    setEditingHolding(null)
  }

  async function handleDeleteHolding(holding: EnrichedHolding) {
    const confirmed = window.confirm(`Delete ${holding.ticker}?`)
    if (!confirmed) return

    setDeletingId(holding.id)
    setError(null)
    setSuccess(null)

    const { error: deleteError } = await supabase
      .from('investing_holdings')
      .delete()
      .eq('id', holding.id)

    if (deleteError) {
      setError(deleteError.message)
      setDeletingId(null)
      return
    }

    setHoldings((prev) => prev.filter((item) => item.id !== holding.id))
    setDeletingId(null)
    setSuccess(`Deleted ${holding.ticker} holding.`)
  }

  async function handleCreateJournalEntry(payload: DecisionJournalFormPayload) {
    if (!journalHolding) return

    setJournalBusy(true)
    setError(null)
    setSuccess(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const record = {
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
    }

    const { error: insertError } = await supabase
      .from('investing_decision_journal')
      .insert(record)

    if (insertError) {
      setError(insertError.message)
      setJournalBusy(false)
      return
    }

    setJournalBusy(false)
    setJournalSheetOpen(false)
    setSuccess(`Created journal entry for ${payload.ticker}.`)
    setJournalHolding(null)
  }

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Portfolio"
        subtitle="Current positions, account split, sector balance, and allocation buckets."
        actions={
          <button type="button" onClick={openAddSheet} className="ui-btn-primary">
            Add holding
          </button>
        }
      />

      <InlineStatusBanner tone="error" message={error} />
      <InlineStatusBanner tone="success" message={success} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <DataCard title="Portfolio Summary">
              <DataCardRow label="Total value" value={formatCurrency(summary.totalValue)} />
              <DataCardRow label="Total holdings" value={String(summary.holdingsCount)} />
              <DataCardRow
                label="Weighted gain/loss"
                value={formatPercent(summary.weightedGainLossPct)}
              />
            </DataCard>

            <DataCard title="Accounts">
              <DataCardRow label="TFSA" value={formatCurrency(summary.tfsaValue)} />
              <DataCardRow
                label="Non-registered"
                value={formatCurrency(summary.nonRegisteredValue)}
              />
              <DataCardRow label="Cash" value={formatCurrency(summary.cashValue)} />
            </DataCard>

            <DataCard title="Top Holdings">
              {topHoldings.length === 0 ? (
                <DataCardRow label="No holdings yet" value="—" />
              ) : (
                topHoldings.map((holding) => (
                  <DataCardRow
                    key={holding.id}
                    label={holding.ticker}
                    value={formatCurrency(holding.market_value)}
                  />
                ))
              )}
            </DataCard>
          </>
        )}
      </section>

      {!loading && holdings.length > 0 ? (
        <InvestingSearchToolbar
          value={search}
          onChange={(value) => {
            setSearch(value)
            setActiveDbSavedViewId(null)
          }}
          placeholder="Search ticker, company, sector, account, bucket, verdict, or thesis status"
          savedViews={getPortfolioSavedViews()}
          activeSavedViewKey={savedView}
          onSavedViewChange={(key) => {
            setSavedView(key)
            setActiveDbSavedViewId(null)
          }}
          filters={getPortfolioFilters()}
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
        title="Sector exposure"
        subtitle="Compare live sector weights against target ranges."
        defaultOpen={true}
      >
        {loading ? (
          <SkeletonCard />
        ) : sectorExposure.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No sector exposure data yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sectorExposure.map((row) => (
              <div key={row.sector} className="ui-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {row.sector}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {formatCurrency(row.marketValue)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {formatPercent(row.pct)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      Target {formatPercent(row.targetMin)} – {formatPercent(row.targetMax)}
                    </div>
                    {(() => {
                      const status = getSectorStatus(row.pct, row.targetMin, row.targetMax)
                      return status ? (
                        <div className={`mt-1 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Allocation buckets"
        subtitle="Check portfolio mix across core, growth, special situations, and cash."
        defaultOpen={false}
      >
        {loading ? (
          <SkeletonCard />
        ) : bucketExposure.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No bucket allocation data yet.
          </div>
        ) : (
          <div className="space-y-3">
            {bucketExposure.map((row) => (
              <div key={row.bucket} className="ui-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {row.bucket}
                    </div>
                    <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {formatCurrency(row.marketValue)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {formatPercent(row.pct)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      Target {formatPercent(row.target)} · Range {formatPercent(row.targetMin)} –{' '}
                      {formatPercent(row.targetMax)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Holdings list"
        subtitle="Full holdings table for detailed review."
        defaultOpen={false}
      >
        {loading ? (
          <SkeletonCard />
        ) : filteredHoldings.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No holdings found.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="lg:hidden">
              <HoldingsCardList
                holdings={filteredHoldings}
                onEdit={openEditSheet}
                onDelete={handleDeleteHolding}
                deletingId={deletingId}
              />
            </div>

            <div className="hidden lg:block">
              <HoldingsTable
                holdings={filteredHoldings}
                onEdit={openEditSheet}
                onDelete={handleDeleteHolding}
                deletingId={deletingId}
              />
            </div>

            <div className="ui-card p-4">
              <div className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
                Create a journal entry directly from a holding:
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {filteredHoldings.map((holding) => (
                  <button
                    key={`journal-${holding.id}`}
                    type="button"
                    onClick={() => openJournalSheet(holding)}
                    className="ui-btn-secondary"
                  >
                    Journal {holding.ticker}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={`Sell/Trim Signals${sellSignals.length > 0 ? ` (${sellSignals.length})` : ''}`}
        defaultOpen={true}
      >
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
        ) : sellSignals.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No sell or trim signals. All positions look healthy.
          </div>
        ) : (
          <div className="space-y-3">
            {sellSignals.map((signal, i) => (
              <div
                key={`${signal.ticker}-${signal.signalType}-${i}`}
                className={`ui-card border-l-4 p-4 ${
                  signal.severity === 'critical'
                    ? 'border-l-red-500'
                    : signal.severity === 'warning'
                      ? 'border-l-yellow-500'
                      : 'border-l-blue-400'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                        {signal.ticker}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          signal.severity === 'critical'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : signal.severity === 'warning'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}
                      >
                        {signal.suggestedAction}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-neutral-700 dark:text-[#c8cdd4]">
                      {signal.title}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      {signal.explanation}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-neutral-500 dark:text-[#a8b2bf]">
                    {signal.currentValue != null ? (
                      <div>
                        $
                        {signal.currentValue.toLocaleString('en-US', {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                    ) : null}
                    {signal.gainLossPct != null ? (
                      <div
                        className={
                          signal.gainLossPct >= 0 ? 'text-green-500' : 'text-red-500'
                        }
                      >
                        {signal.gainLossPct >= 0 ? '+' : ''}
                        {signal.gainLossPct.toFixed(1)}%
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={`Rebalancing Alerts${rebalanceAlerts.length > 0 ? ` (${rebalanceAlerts.length})` : ''}`}
        defaultOpen={true}
      >
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
        ) : rebalanceAlerts.length === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            Portfolio is balanced. No rebalancing needed.
          </div>
        ) : (
          <div className="space-y-3">
            {rebalanceAlerts.map((alert, i) => (
              <div
                key={`${alert.category}-${alert.name}-${i}`}
                className={`ui-card border-l-4 p-4 ${
                  alert.status === 'cash_low' || alert.status === 'position_concentrated'
                    ? 'border-l-red-500'
                    : alert.status === 'overweight'
                      ? 'border-l-yellow-500'
                      : 'border-l-blue-400'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                        {alert.name}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          alert.status === 'overweight'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : alert.status === 'underweight'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {alert.status === 'cash_low'
                          ? 'Low cash'
                          : alert.status === 'position_concentrated'
                            ? 'Concentrated'
                            : alert.status === 'overweight'
                              ? 'Overweight'
                              : 'Underweight'}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-[#a8b2bf]">
                        {alert.category === 'sector'
                          ? 'Sector'
                          : alert.category === 'bucket'
                            ? 'Bucket'
                            : 'Portfolio'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      {alert.suggestion}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-neutral-500 dark:text-[#a8b2bf]">
                    <div className="text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
                      {alert.currentPct.toFixed(1)}%
                    </div>
                    <div>
                      Target: {alert.targetMinPct != null ? `${alert.targetMinPct}%` : '—'} –{' '}
                      {alert.targetMaxPct != null ? `${alert.targetMaxPct}%` : '—'}
                    </div>
                    <div className={alert.deviationPct > 3 ? 'text-red-500' : 'text-yellow-500'}>
                      {alert.status === 'underweight' ? '−' : '+'}
                      {alert.deviationPct.toFixed(1)}% off
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Decision journal" defaultOpen={false}>
  <div className="space-y-3">
    <p className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
      Log buy, sell, add, and trim decisions with emotional state tracking and pre-decision checklists.
    </p>

    <div className="grid grid-cols-3 gap-3">
      <div className="ui-card p-3 text-center">
        <div className="text-lg font-bold text-neutral-900 dark:text-[#e6eaf0]">
          {journalEntryCount}
        </div>
        <div className="text-xs text-neutral-500 dark:text-[#a8b2bf]">Total entries</div>
      </div>
      <div className="ui-card p-3 text-center">
        <div className="text-lg font-bold text-neutral-900 dark:text-[#e6eaf0]">
          {overdueReviewCount}
        </div>
        <div className="text-xs text-neutral-500 dark:text-[#a8b2bf]">Overdue reviews</div>
      </div>
      <div className="ui-card p-3 text-center">
        <div className="text-lg font-bold text-neutral-900 dark:text-[#e6eaf0]">
          {recentEntryDate || '—'}
        </div>
        <div className="text-xs text-neutral-500 dark:text-[#a8b2bf]">Last entry</div>
      </div>
    </div>

    <div className="flex gap-2">
      <Link href="/investing/journal" className="ui-btn-primary text-sm">
        Open journal
      </Link>
      <Link href="/investing/journal?mode=new" className="ui-btn-secondary text-sm">
        New entry
      </Link>
    </div>
  </div>
</CollapsibleSection>

      <CollapsibleSection title="Position Sizer" defaultOpen={false}>
        <div className="ui-card p-4 space-y-4">
          <p className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
            Calculate how many shares to buy based on confidence, portfolio limits, sector and bucket caps, and cash reserves.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
                Ticker
              </label>
              <input
                value={sizerTicker}
                onChange={(e) => setSizerTicker(e.target.value.toUpperCase())}
                placeholder="e.g. AAPL"
                className="ui-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
                Current Price
              </label>
              <input
                type="number"
                step="0.01"
                value={sizerPrice}
                onChange={(e) => setSizerPrice(e.target.value)}
                placeholder="e.g. 195.50"
                className="ui-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
                Confidence
              </label>
              <select
                value={sizerConfidence}
                onChange={(e) =>
                  setSizerConfidence(e.target.value as 'High' | 'Medium' | 'Low')
                }
                className="ui-input"
              >
                <option value="High">High (10% max)</option>
                <option value="Medium">Medium (7% max)</option>
                <option value="Low">Low (5% max)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
                Sector
              </label>
              <select
                value={sizerSector}
                onChange={(e) => setSizerSector(e.target.value)}
                className="ui-input"
              >
                <option value="">Select sector</option>
                <option value="Technology">Technology</option>
                <option value="Consumer Staples">Consumer Staples</option>
                <option value="Consumer Discretionary">Consumer Discretionary</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Financials">Financials</option>
                <option value="Industrials">Industrials</option>
                <option value="Energy">Energy</option>
                <option value="Communication Services">Communication Services</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Utilities">Utilities</option>
                <option value="Materials">Materials</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
                Bucket
              </label>
              <select
                value={sizerBucket}
                onChange={(e) => setSizerBucket(e.target.value)}
                className="ui-input"
              >
                <option value="Core compounder">Core compounder</option>
                <option value="Quality growth">Quality growth</option>
                <option value="Special opportunity">Special opportunity</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleComputePositionSize}
            disabled={!sizerTicker.trim() || !sizerPrice}
            className="ui-btn-primary"
          >
            Calculate Position Size
          </button>

          {sizerResult ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="text-lg font-bold text-blue-900 dark:text-blue-200">
                  Buy {sizerResult.suggestedShares} shares
                </div>
                <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  ≈ $
                  {sizerResult.suggestedInvestment.toLocaleString('en-US', {
                    maximumFractionDigits: 0,
                  })}{' '}
                  investment
                </div>
                <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  Binding constraint: {sizerResult.constraintHit}
                </div>
              </div>

              <div className="ui-card p-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">
                    Max position ({sizerResult.maxPositionPct}%)
                  </span>
                  <span>
                    $
                    {sizerResult.maxPositionValue.toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">
                    Position room remaining
                  </span>
                  <span>
                    $
                    {sizerResult.remainingRoom.toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                {sizerResult.sectorCap != null ? (
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-[#a8b2bf]">Sector room</span>
                    <span>
                      $
                      {(sizerResult.sectorRoom ?? 0).toLocaleString('en-US', {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                ) : null}
                {sizerResult.bucketCap != null ? (
                  <div className="flex justify-between">
                    <span className="text-neutral-600 dark:text-[#a8b2bf]">Bucket room</span>
                    <span>
                      $
                      {(sizerResult.bucketRoom ?? 0).toLocaleString('en-US', {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">
                    Available cash (after 5% floor)
                  </span>
                  <span>
                    $
                    {sizerResult.availableCash.toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">
                    Cash floor reserve
                  </span>
                  <span>
                    $
                    {sizerResult.cashFloorReserve.toLocaleString('en-US', {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>

              {sizerResult.warnings.length > 0 ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                  {sizerResult.warnings.map((warning, i) => (
                    <div
                      key={i}
                      className="text-sm text-yellow-800 dark:text-yellow-300"
                    >
                      {warning}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </CollapsibleSection>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingHolding?.id ? `Edit ${editingHolding.ticker}` : 'Add holding'}
      >
        <HoldingForm
          key={
            editingHolding?.id
              ? editingHolding.id
              : `new-holding-${editingHolding?.ticker ?? 'blank'}`
          }
          initialHolding={editingHolding}
          onSubmit={handleSaveHolding}
          onCancel={closeSheet}
          submitLabel={editingHolding?.id ? 'Save changes' : 'Add holding'}
          busy={formBusy}
        />
      </BottomSheet>

      <BottomSheet
        open={journalSheetOpen}
        onClose={closeJournalSheet}
        title={journalHolding ? `Journal ${journalHolding.ticker}` : 'Create journal entry'}
      >
        {journalHolding ? (
          <DecisionJournalForm
            key={`journal-form-${journalHolding.id || journalHolding.ticker}`}
            initialEntry={holdingToJournalSeed(journalHolding)}
            onSubmit={handleCreateJournalEntry}
            onCancel={closeJournalSheet}
            submitLabel="Create journal entry"
            busy={journalBusy}
          />
        ) : null}
      </BottomSheet>
    </div>
  )
}

export default function InvestingPortfolioPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <SkeletonCard />
        </div>
      }
    >
      <InvestingPortfolioPageContent />
    </Suspense>
  )
}