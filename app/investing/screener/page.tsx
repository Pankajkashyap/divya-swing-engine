'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'

type ScreenerRuleResult = {
  id: string
  label: string
  metric: string
  thresholdText: string
  actualValueText: string
  status: 'pass' | 'fail' | 'inconclusive'
  explanation: string
}

type RedFlagResult = {
  id: string
  label: string
  triggered: boolean
  severity: 'warning' | 'critical'
  explanation: string
}

type ScorecardCategoryScore = {
  id: 'valuation' | 'quality' | 'financialHealth' | 'growth'
  label: string
  score: number
  maxScore: number
  passed: number
  failed: number
  inconclusive: number
  explanation: string
}

type VerdictResult = {
  label: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid' | 'Red Flag'
  explanation: string
  overallScore: number
  criticalRedFlags: number
  warningRedFlags: number
}

type ScreenerEngineResult = {
  snapshot: {
    ticker: string
    company: string
    sector: string
    currentPrice: number | null
    marketCap: number | null
    roicTtm: number | null
    roic5yAvg?: number | null
    roeTtm: number | null
    grossMarginTtm: number | null
    operatingMarginTtm: number | null
    fcfMarginTtm: number | null
    evToEbitTtm: number | null
    earningsYieldTtm: number | null
    forwardPe: number | null
    pegRatio: number | null
    priceToFcfTtm: number | null
    debtToEquity: number | null
    netDebtToEbitda: number | null
    interestCoverage: number | null
    currentRatio: number | null
    revenueGrowth3yCagr: number | null
    epsGrowth3yCagr: number | null
    fcfGrowth3yCagr: number | null
    freeCashFlowTtm?: number | null
    fairValueLow?: number | null
    fairValueBase?: number | null
    fairValueHigh?: number | null
    fairValueValidMethodCount?: number | null
  }
  rules: ScreenerRuleResult[]
  redFlags: RedFlagResult[]
  passedRules: number
  failedRules: number
  inconclusiveRules: number
  criticalRedFlags: number
  passedInitialScreen: boolean
  scorecard?: {
    categories: ScorecardCategoryScore[]
    overallScore: number
    maxScore: number
  }
  verdict?: VerdictResult
}

function formatPrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '--'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatMarketCap(value: number | null) {
  if (value == null || Number.isNaN(value)) return '--'

  const abs = Math.abs(value)

  if (abs >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`
  }

  if (abs >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`
  }

  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }

  return `$${value.toFixed(0)}`
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '--'
  return `${value.toFixed(1)}%`
}

function formatMultiple(value: number | null) {
  if (value == null || Number.isNaN(value)) return '--'
  return `${value.toFixed(2)}x`
}

function formatRatio(value: number | null) {
  if (value == null || Number.isNaN(value)) return '--'
  return value.toFixed(2)
}

export default function InvestingScreenerPage() {
  const [ticker, setTicker] = useState('MSFT')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScreenerEngineResult | null>(null)

  const marginOfSafetyVsBase = useMemo(() => {
    if (!result) return null

    const price = result.snapshot.currentPrice
    const fairValueBase = result.snapshot.fairValueBase

    if (
      price == null ||
      fairValueBase == null ||
      Number.isNaN(price) ||
      Number.isNaN(fairValueBase) ||
      fairValueBase === 0
    ) {
      return null
    }

    return ((fairValueBase - price) / fairValueBase) * 100
  }, [result])

  const createAnalysisHref = useMemo(() => {
    if (!result) return null

    const params = new URLSearchParams({
      mode: 'new',
      ticker: result.snapshot.ticker,
      company: result.snapshot.company,
      sector: result.snapshot.sector,
      fair_value_low:
        result.snapshot.fairValueLow != null ? String(result.snapshot.fairValueLow) : '',
      fair_value_base:
        result.snapshot.fairValueBase != null ? String(result.snapshot.fairValueBase) : '',
      fair_value_high:
        result.snapshot.fairValueHigh != null ? String(result.snapshot.fairValueHigh) : '',
      current_price:
        result.snapshot.currentPrice != null ? String(result.snapshot.currentPrice) : '',
      verdict: result.verdict?.label ?? '',
      confidence:
        result.verdict?.label === 'Strong Buy' || result.verdict?.label === 'Buy'
          ? 'High'
          : result.verdict?.label === 'Hold'
            ? 'Medium'
            : 'Low',
      roic_ttm: result.snapshot.roicTtm != null ? String(result.snapshot.roicTtm) : '',
      roic_5y_avg: result.snapshot.roic5yAvg != null ? String(result.snapshot.roic5yAvg) : '',
      roe_ttm: result.snapshot.roeTtm != null ? String(result.snapshot.roeTtm) : '',
      debt_to_equity:
        result.snapshot.debtToEquity != null ? String(result.snapshot.debtToEquity) : '',
      net_debt_to_ebitda:
        result.snapshot.netDebtToEbitda != null ? String(result.snapshot.netDebtToEbitda) : '',
      interest_coverage:
        result.snapshot.interestCoverage != null ? String(result.snapshot.interestCoverage) : '',
      current_ratio:
        result.snapshot.currentRatio != null ? String(result.snapshot.currentRatio) : '',
      free_cash_flow_ttm:
        result.snapshot.freeCashFlowTtm != null ? String(result.snapshot.freeCashFlowTtm) : '',
    })

    return `/investing/analysis?${params.toString()}`
  }, [result])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/investing/api/evaluate-ticker?ticker=${encodeURIComponent(ticker)}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to evaluate ticker.')
      }

      setResult(data)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Unknown error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            Screener Tester
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            Test the investing screener engine with a ticker.
          </p>
        </div>

        {createAnalysisHref ? (
          <Link href={createAnalysisHref} className="ui-btn-secondary">
            Send to Analysis
          </Link>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="ui-card p-4">
        <div className="flex gap-3">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Enter ticker"
            className="ui-input max-w-xs"
          />
          <button type="submit" className="ui-btn-primary" disabled={loading}>
            {loading ? 'Running...' : 'Run screener'}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {result ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="ui-card p-4">
              <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">Company</div>
              <div className="mt-1 text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                {result.snapshot.company}
              </div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                {result.snapshot.ticker} · {result.snapshot.sector}
              </div>
            </div>

            <div className="ui-card p-4">
              <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">Screen summary</div>
              <div className="mt-2 space-y-1 text-sm text-neutral-900 dark:text-[#e6eaf0]">
                <div>Passed rules: {result.passedRules}</div>
                <div>Failed rules: {result.failedRules}</div>
                <div>Inconclusive: {result.inconclusiveRules}</div>
                <div>Critical red flags: {result.criticalRedFlags}</div>
              </div>
            </div>

            <div className="ui-card p-4">
              <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">
                Hard filter result
              </div>
              <div className="mt-2 text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                {result.passedInitialScreen ? 'PASS' : 'FAIL'}
              </div>
            </div>

            <div className="ui-card p-4">
              <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">Verdict</div>
              <div className="mt-2 text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                {result.verdict?.label ?? '--'}
              </div>
              <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                {result.verdict?.explanation ?? 'No verdict yet.'}
              </div>
            </div>
          </div>

          {result.scorecard ? (
            <div className="ui-card p-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Quantitative Scorecard
              </h2>
              <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                Overall quantitative score: {result.scorecard.overallScore.toFixed(1)} /{' '}
                {result.scorecard.maxScore}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {result.scorecard.categories.map((category) => (
                  <div
                    key={category.id}
                    className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {category.label}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {category.score.toFixed(1)} / {category.maxScore}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                      Pass {category.passed} · Fail {category.failed} · Inconclusive{' '}
                      {category.inconclusive}
                    </div>
                    <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      {category.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="ui-card p-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Snapshot
            </h2>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>Price: {formatPrice(result.snapshot.currentPrice)}</div>
              <div>Market cap: {formatMarketCap(result.snapshot.marketCap)}</div>
              <div>Fair value low: {formatPrice(result.snapshot.fairValueLow)}</div>
              <div>Fair value base: {formatPrice(result.snapshot.fairValueBase)}</div>
              <div>Fair value high: {formatPrice(result.snapshot.fairValueHigh)}</div>
              <div>
                Method count:{' '}
                {result.snapshot.fairValueValidMethodCount == null
                  ? '--'
                  : result.snapshot.fairValueValidMethodCount}
              </div>
              <div>Margin of safety vs base: {formatPercent(marginOfSafetyVsBase)}</div>
              <div>ROIC: {formatPercent(result.snapshot.roicTtm)}</div>
              <div>ROE: {formatPercent(result.snapshot.roeTtm)}</div>
              <div>Gross margin: {formatPercent(result.snapshot.grossMarginTtm)}</div>
              <div>Operating margin: {formatPercent(result.snapshot.operatingMarginTtm)}</div>
              <div>FCF margin: {formatPercent(result.snapshot.fcfMarginTtm)}</div>
              <div>EV/EBIT: {formatMultiple(result.snapshot.evToEbitTtm)}</div>
              <div>Earnings yield: {formatPercent(result.snapshot.earningsYieldTtm)}</div>
              <div>Forward PE: {formatMultiple(result.snapshot.forwardPe)}</div>
              <div>PEG: {formatRatio(result.snapshot.pegRatio)}</div>
              <div>Price/FCF: {formatMultiple(result.snapshot.priceToFcfTtm)}</div>
              <div>Debt/Equity: {formatRatio(result.snapshot.debtToEquity)}</div>
              <div>Net Debt/EBITDA: {formatMultiple(result.snapshot.netDebtToEbitda)}</div>
              <div>Interest coverage: {formatMultiple(result.snapshot.interestCoverage)}</div>
              <div>Current ratio: {formatRatio(result.snapshot.currentRatio)}</div>
              <div>Revenue CAGR: {formatPercent(result.snapshot.revenueGrowth3yCagr)}</div>
              <div>EPS CAGR: {formatPercent(result.snapshot.epsGrowth3yCagr)}</div>
              <div>FCF CAGR: {formatPercent(result.snapshot.fcfGrowth3yCagr)}</div>
            </div>
          </div>

          <div className="ui-card p-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Rules
            </h2>
            <div className="mt-3 space-y-3">
              {result.rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                        {rule.label}
                      </div>
                      <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                        Threshold: {rule.thresholdText} | Actual: {rule.actualValueText}
                      </div>
                      <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                        {rule.explanation}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      {rule.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ui-card p-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Red Flags
            </h2>
            <div className="mt-3 space-y-3">
              {result.redFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                        {flag.label}
                      </div>
                      <div className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                        {flag.explanation}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                        {flag.triggered ? 'TRIGGERED' : 'CLEAR'}
                      </div>
                      <div className="text-neutral-500 dark:text-[#a8b2bf]">
                        {flag.severity}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}