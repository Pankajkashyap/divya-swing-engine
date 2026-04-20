'use client'

import { FormEvent, useState } from 'react'

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

type ScreenerEngineResult = {
  snapshot: {
    ticker: string
    company: string
    sector: string
    currentPrice: number | null
    marketCap: number | null
    roicTtm: number | null
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

function formatMaybeNumber(value: number | null) {
  if (value == null || Number.isNaN(value)) return '--'
  return String(value)
}

export default function InvestingScreenerPage() {
  const [ticker, setTicker] = useState('MSFT')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScreenerEngineResult | null>(null)

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
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Screener Tester
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
          Test the investing screener engine with a ticker.
        </p>
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
              <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">Initial screen</div>
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

        {result?.scorecard ? (
            <div className="ui-card p-4">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Quantitative Scorecard
                </h2>
                <div className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                Overall quantitative score: {result.scorecard.overallScore.toFixed(1)} / {result.scorecard.maxScore}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {result.scorecard.categories.map((category) => (
                    <div key={category.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                        {category.label}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                        {category.score.toFixed(1)} / {category.maxScore}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
                        Pass {category.passed} · Fail {category.failed} · Inconclusive {category.inconclusive}
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
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>Price: {formatMaybeNumber(result.snapshot.currentPrice)}</div>
              <div>Market cap: {formatMaybeNumber(result.snapshot.marketCap)}</div>
              <div>ROIC: {formatMaybeNumber(result.snapshot.roicTtm)}</div>
              <div>ROE: {formatMaybeNumber(result.snapshot.roeTtm)}</div>
              <div>Gross margin: {formatMaybeNumber(result.snapshot.grossMarginTtm)}</div>
              <div>Operating margin: {formatMaybeNumber(result.snapshot.operatingMarginTtm)}</div>
              <div>FCF margin: {formatMaybeNumber(result.snapshot.fcfMarginTtm)}</div>
              <div>EV/EBIT: {formatMaybeNumber(result.snapshot.evToEbitTtm)}</div>
              <div>Earnings yield: {formatMaybeNumber(result.snapshot.earningsYieldTtm)}</div>
              <div>Forward PE: {formatMaybeNumber(result.snapshot.forwardPe)}</div>
              <div>PEG: {formatMaybeNumber(result.snapshot.pegRatio)}</div>
              <div>Price/FCF: {formatMaybeNumber(result.snapshot.priceToFcfTtm)}</div>
              <div>Debt/Equity: {formatMaybeNumber(result.snapshot.debtToEquity)}</div>
              <div>Net Debt/EBITDA: {formatMaybeNumber(result.snapshot.netDebtToEbitda)}</div>
              <div>Interest coverage: {formatMaybeNumber(result.snapshot.interestCoverage)}</div>
              <div>Current ratio: {formatMaybeNumber(result.snapshot.currentRatio)}</div>
              <div>Revenue CAGR: {formatMaybeNumber(result.snapshot.revenueGrowth3yCagr)}</div>
              <div>EPS CAGR: {formatMaybeNumber(result.snapshot.epsGrowth3yCagr)}</div>
              <div>FCF CAGR: {formatMaybeNumber(result.snapshot.fcfGrowth3yCagr)}</div>
            </div>
          </div>

          <div className="ui-card p-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
              Rules
            </h2>
            <div className="mt-3 space-y-3">
              {result.rules.map((rule) => (
                <div key={rule.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
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
                <div key={flag.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
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