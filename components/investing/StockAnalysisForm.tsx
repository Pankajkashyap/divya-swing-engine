'use client'

import { useState } from 'react'
import type { Confidence, Sector, StockAnalysis, Verdict } from '@/app/investing/types'
import { buildMoatManagementPrompt } from '@/app/investing/lib/qualitative/buildMoatManagementPrompt'
import { parseQualitativeImport } from '@/app/investing/lib/qualitative/parseQualitativeImport'
import { scoreQualitativeImport } from '@/app/investing/lib/qualitative/scoreQualitativeImport'

export type StockAnalysisFormPayload = {
  ticker: string
  company: string
  analysis_date: string
  sector: Sector
  moat_score: number | null
  valuation_score: number | null
  mgmt_score: number | null
  roic_score: number | null
  fin_health_score: number | null
  biz_understanding_score: number | null
  verdict: Verdict | null
  fair_value_low: number | null
  fair_value_high: number | null
  thesis: string | null
  thesis_breakers: string | null
  confidence: Confidence | null
  raw_analysis: string | null
  moat_json: Record<string, unknown> | null
  management_json: Record<string, unknown> | null
  moat_score_auto: number | null
  management_score_auto: number | null
  qualitative_confidence: string | null
  business_understanding_json: Record<string, unknown> | null
}

type Props = {
  initialAnalysis?: StockAnalysis | null
  onSubmit: (values: StockAnalysisFormPayload) => Promise<void> | void
  onCancel?: () => void
  submitLabel?: string
  busy?: boolean
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(1)}/10`
}

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return `$${value.toFixed(0)}`
}

function formatText(value: string | null | undefined) {
  return value?.trim() ? value : '—'
}

export function StockAnalysisForm({
  initialAnalysis,
  onSubmit,
  submitLabel,
  busy,
}: Props) {
  const [showEngineDetails, setShowEngineDetails] = useState(false)
  const [thesis, setThesis] = useState(initialAnalysis?.thesis ?? '')
  const [thesisBreakers, setThesisBreakers] = useState(initialAnalysis?.thesis_breakers ?? '')
  const [bizUnderstanding, setBizUnderstanding] = useState<'high' | 'medium' | 'low' | null>(
    initialAnalysis?.biz_understanding_score != null
      ? initialAnalysis.biz_understanding_score >= 7
        ? 'high'
        : initialAnalysis.biz_understanding_score >= 5
          ? 'medium'
          : 'low'
      : null
  )
  const [verdictOverride, setVerdictOverride] = useState<Verdict | ''>('')

  const [qualStep, setQualStep] = useState<'not_started' | 'waiting' | 'done'>(
    initialAnalysis?.moat_score_auto != null ? 'done' : 'not_started'
  )
  const [promptCopied, setPromptCopied] = useState(false)
  const [qualJsonText, setQualJsonText] = useState('')
  const [qualError, setQualError] = useState<string | null>(null)
  const [moatScoreAuto, setMoatScoreAuto] = useState<number | null>(
    initialAnalysis?.moat_score_auto ?? null
  )
  const [mgmtScoreAuto, setMgmtScoreAuto] = useState<number | null>(
    initialAnalysis?.management_score_auto ?? null
  )
  const [moatJson, setMoatJson] = useState<Record<string, unknown> | null>(
    initialAnalysis?.moat_json ?? null
  )
  const [mgmtJson, setMgmtJson] = useState<Record<string, unknown> | null>(
    initialAnalysis?.management_json ?? null
  )
  const [qualitativeConfidence, setQualitativeConfidence] = useState<string | null>(
    initialAnalysis?.qualitative_confidence ?? null
  )

  const ticker = initialAnalysis?.ticker ?? ''
  const company = initialAnalysis?.company ?? ''
  const analysisDate = initialAnalysis?.analysis_date || getTodayDateString()
  const sector = ((initialAnalysis?.sector as Sector | undefined) || 'Technology') as Sector

  const engineVerdict = initialAnalysis?.verdict_auto ?? initialAnalysis?.verdict ?? null
  const engineConfidence = initialAnalysis?.confidence_auto ?? initialAnalysis?.confidence ?? null
  const engineValuation =
    initialAnalysis?.valuation_score ?? initialAnalysis?.valuation_score_auto ?? null
  const engineRoic = initialAnalysis?.roic_score ?? initialAnalysis?.roic_score_auto ?? null
  const engineFinHealth =
    initialAnalysis?.fin_health_score ?? initialAnalysis?.fin_health_score_auto ?? null
  const engineOverall = initialAnalysis?.overall_score ?? null

  async function handleCopyPrompt() {
    const prompt = buildMoatManagementPrompt({
      ticker: initialAnalysis?.ticker ?? '',
      company: initialAnalysis?.company ?? '',
      sector: initialAnalysis?.sector ?? null,
      thesisNotes: thesis || null,
    })

    try {
      await navigator.clipboard.writeText(prompt)
      setPromptCopied(true)
      setQualError(null)
      setQualStep('waiting')
    } catch {
      setQualError('Failed to copy. Try manually selecting the prompt text.')
      setQualStep('waiting')
    }
  }

  function handleImportQualitative() {
    setQualError(null)

    try {
      const parsed = parseQualitativeImport(qualJsonText)
      const scored = scoreQualitativeImport(parsed)

      setMoatScoreAuto(scored.moatScoreAuto)
      setMgmtScoreAuto(scored.managementScoreAuto)
      setMoatJson(parsed.moat as unknown as Record<string, unknown>)
      setMgmtJson(parsed.management as unknown as Record<string, unknown>)
      setQualitativeConfidence(parsed.confidence)
      setQualStep('done')
      setQualJsonText('')
      setPromptCopied(false)
    } catch (err) {
      setQualError(err instanceof Error ? err.message : 'Invalid JSON. Check the ChatGPT response.')
    }
  }

  function handleSubmit() {
    if (!initialAnalysis) return

    const bizScore =
      bizUnderstanding === 'high' ? 8 : bizUnderstanding === 'medium' ? 6 : bizUnderstanding === 'low' ? 4 : null

    const payload: StockAnalysisFormPayload = {
      ticker: initialAnalysis.ticker,
      company: initialAnalysis.company,
      analysis_date: initialAnalysis.analysis_date || getTodayDateString(),
      sector: (initialAnalysis.sector as Sector) || 'Technology',
      moat_score: null,
      valuation_score: initialAnalysis.valuation_score ?? null,
      mgmt_score: null,
      roic_score: initialAnalysis.roic_score ?? null,
      fin_health_score: initialAnalysis.fin_health_score ?? null,
      biz_understanding_score: bizScore,
      verdict: verdictOverride || initialAnalysis.verdict || null,
      fair_value_low: initialAnalysis.fair_value_low ?? null,
      fair_value_high: initialAnalysis.fair_value_high ?? null,
      thesis: thesis.trim() || null,
      thesis_breakers: thesisBreakers.trim() || null,
      confidence: initialAnalysis.confidence || null,
      raw_analysis: null,
      moat_json: moatJson,
      management_json: mgmtJson,
      moat_score_auto: moatScoreAuto,
      management_score_auto: mgmtScoreAuto,
      qualitative_confidence: qualitativeConfidence,
      business_understanding_json: null,
    }

    void onSubmit(payload)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold text-neutral-900 dark:text-[#e6eaf0]">
            {ticker} · {company}
          </div>
          <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">
            {sector} · {analysisDate}
          </div>
        </div>
      </div>

      <div className="ui-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            Engine Summary
          </div>
          <button
            type="button"
            onClick={() => setShowEngineDetails((prev) => !prev)}
            className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-[#a8b2bf]"
          >
            {showEngineDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-neutral-500 dark:text-[#a8b2bf]">Verdict: </span>
            <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
              {formatText(engineVerdict)}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-[#a8b2bf]">Fair value: </span>
            <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
              {formatMoney(initialAnalysis?.fair_value_low)} – {formatMoney(initialAnalysis?.fair_value_high)}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-[#a8b2bf]">Score: </span>
            <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
              {engineOverall != null ? `${engineOverall.toFixed(1)}/10` : '—'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-[#a8b2bf]">Confidence: </span>
            <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
              {formatText(engineConfidence)}
            </span>
          </div>
        </div>

        {showEngineDetails ? (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-200 pt-3 text-xs dark:border-neutral-700">
            <div>Valuation: {formatScore(engineValuation)}</div>
            <div>ROIC: {formatScore(engineRoic)}</div>
            <div>Financial Health: {formatScore(engineFinHealth)}</div>
            <div>Growth: —</div>
            <div className="col-span-2">
              Red flags: {formatText(initialAnalysis?.thesis_breakers)}
            </div>
          </div>
        ) : null}
      </div>

      <div className="ui-card p-4">
        <div className="mb-1 text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Qualitative Analysis
        </div>

        {qualStep === 'not_started' ? (
          <div>
            <p className="mb-3 text-xs text-neutral-500 dark:text-[#a8b2bf]">
              Copy a prompt, paste it in ChatGPT, then paste the JSON response back here.
            </p>
            <button type="button" onClick={() => void handleCopyPrompt()} className="ui-btn-primary">
              Copy Prompt for ChatGPT
            </button>
            {qualError ? <div className="mt-2 text-xs text-red-500">{qualError}</div> : null}
          </div>
        ) : null}

        {qualStep === 'waiting' ? (
          <div className="space-y-3">
            {promptCopied ? (
              <div className="rounded-md bg-green-50 p-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-300">
                Prompt copied! Paste it in ChatGPT, then paste the JSON response below.
              </div>
            ) : null}

            <textarea
              value={qualJsonText}
              onChange={(e) => setQualJsonText(e.target.value)}
              placeholder="Paste ChatGPT JSON response here..."
              rows={4}
              className="ui-input w-full font-mono text-xs"
            />

            {qualError ? <div className="text-xs text-red-500">{qualError}</div> : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleImportQualitative}
                disabled={!qualJsonText.trim()}
                className="ui-btn-primary"
              >
                Import Response
              </button>
              <button
                type="button"
                onClick={() => void handleCopyPrompt()}
                className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-[#a8b2bf]"
              >
                Re-copy prompt
              </button>
            </div>
          </div>
        ) : null}

        {qualStep === 'done' ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3 text-sm">
              <div>
                <span className="text-neutral-500 dark:text-[#a8b2bf]">Moat: </span>
                <span className="font-medium text-green-500">{moatScoreAuto?.toFixed(1) ?? '—'}/10</span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-[#a8b2bf]">Management: </span>
                <span className="font-medium text-green-500">{mgmtScoreAuto?.toFixed(1) ?? '—'}/10</span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-[#a8b2bf]">Confidence: </span>
                <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  {qualitativeConfidence ?? '—'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setQualStep('waiting')
                setQualJsonText('')
                setQualError(null)
              }}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-[#a8b2bf]"
            >
              Re-import
            </button>
          </div>
        ) : null}
      </div>

      <div className="ui-card p-4 space-y-4">
        <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Your Assessment
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
            How well do you understand this business?
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { value: 'high' as const, label: 'I know it well', color: 'text-green-500', score: '8/10' },
              { value: 'medium' as const, label: 'Reasonably well', color: 'text-yellow-500', score: '6/10' },
              { value: 'low' as const, label: 'Still learning', color: 'text-red-500', score: '4/10' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setBizUnderstanding(option.value)}
                className={`rounded-lg border p-3 text-center text-sm transition ${
                  bizUnderstanding === option.value
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                }`}
              >
                <div className={`text-lg font-bold ${option.color}`}>●</div>
                <div className="mt-1 text-xs font-medium text-neutral-900 dark:text-[#e6eaf0]">
                  {option.label}
                </div>
                <div className="text-xs text-neutral-500">{option.score}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
            Investment Thesis <span className="text-red-400">*</span>
          </label>
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder="Why invest? What's the core reason it will compound?"
            rows={3}
            className="ui-input w-full"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
            What would make you sell? <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          <textarea
            value={thesisBreakers}
            onChange={(e) => setThesisBreakers(e.target.value)}
            placeholder="e.g., Membership renewal drops below 85%..."
            rows={2}
            className="ui-input w-full"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#a8b2bf]">
            Override verdict?{' '}
            <span className="font-normal text-neutral-500">
              (optional — leave blank to accept engine verdict)
            </span>
          </label>
          <select
            value={verdictOverride}
            onChange={(e) => setVerdictOverride(e.target.value as Verdict | '')}
            className="ui-input max-w-xs"
          >
            <option value="">Accept engine verdict</option>
            <option value="Strong Buy">Strong Buy</option>
            <option value="Buy">Buy</option>
            <option value="Hold">Hold</option>
            <option value="Avoid">Avoid</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || !thesis.trim()}
          className="ui-btn-primary"
        >
          {busy ? 'Saving...' : submitLabel || 'Save Analysis'}
        </button>
      </div>
    </div>
  )
}