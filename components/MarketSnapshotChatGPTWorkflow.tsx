'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type RawMarketData = {
  new_highs_count: number | null
  new_lows_count: number | null
}

type ApplySuccessResult = {
  success: true
  market_phase:
    | 'confirmed_uptrend'
    | 'under_pressure'
    | 'rally_attempt'
    | 'correction'
    | 'bear'
  max_long_exposure_pct: number
  snapshot_date: string
}

type ApplyResult = ApplySuccessResult | { error: string }

type MarketSnapshotChatGPTWorkflowProps = {
  onApplySuccess?: (result: {
    market_phase: string
    max_long_exposure_pct: number
    snapshot_date: string
  }) => void
}

function buildClipboardContent(): string {
  const today = new Date().toLocaleDateString('en-CA')

  return `You are a financial data researcher. Your only job is to
look up 2 specific data points and return them as a JSON
object.

STRICT OUTPUT RULES:
- Return ONLY a valid JSON object.
- No markdown, no backticks, no explanation, no preamble,
  no trailing text.
- Both fields must be present.
- Return null for any field you cannot verify with a source.
  Do not guess. Do not infer.

TODAY'S DATE: ${today}

FIELD 1 & 2 — New 52-week highs and lows:
Look up how many stocks made new 52-week highs and new
52-week lows today on NYSE + NASDAQ combined.
Use the most recent trading day if today is not a
trading day.
Preferred sources: WSJ Markets (wsj.com/market-data),
Barchart.com, or StockCharts.com.
You MUST find an actual number from an actual source.
Do not estimate.

SELF-VALIDATION — run these checks before returning JSON:

CHECK 1 — Source confirmation:
For new_highs_count and new_lows_count, you must have
found a specific number from a specific page. If you only
found general commentary, return null.

CHECK 2 — Sanity check:
If SPY is above $550 and new_lows exceed new_highs by
more than 5:1, re-verify your breadth source before
returning.

RETURN THIS EXACT JSON STRUCTURE:
{
  "new_highs_count": 0,
  "new_lows_count": 0
}`
}

function isValidRawData(row: unknown): row is RawMarketData {
  if (typeof row !== 'object' || row === null) return false
  const r = row as Record<string, unknown>

  const validNewHighs =
    r.new_highs_count === null ||
    (typeof r.new_highs_count === 'number' &&
      Number.isFinite(r.new_highs_count) &&
      r.new_highs_count >= 0)

  const validNewLows =
    r.new_lows_count === null ||
    (typeof r.new_lows_count === 'number' &&
      Number.isFinite(r.new_lows_count) &&
      r.new_lows_count >= 0)

  return validNewHighs && validNewLows && 'new_highs_count' in r && 'new_lows_count' in r
}

async function copyTextWithFallback(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  document.execCommand('copy')
  document.body.removeChild(textArea)
}

export function MarketSnapshotChatGPTWorkflow({
  onApplySuccess,
}: MarketSnapshotChatGPTWorkflowProps) {
  const router = useRouter()
  const [copySuccess, setCopySuccess] = useState(false)
  const [importText, setImportText] = useState('')
  const [parsedImport, setParsedImport] = useState<RawMarketData | null>(null)
  const [importValidation, setImportValidation] = useState<
    'empty' | 'valid' | 'invalid' | 'schema'
  >('empty')
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const clipboardContent = useMemo(() => buildClipboardContent(), [])
  const clipboardPreview = useMemo(
    () => clipboardContent.split('\n').slice(0, 3).join('\n'),
    [clipboardContent]
  )

  useEffect(() => {
    setImportSuccess(null)
    setImportError(null)

    if (!importText.trim()) {
      setImportValidation('empty')
      setParsedImport(null)
      return
    }

    try {
      const parsed = JSON.parse(importText) as unknown

      if (!isValidRawData(parsed)) {
        setImportValidation('schema')
        setParsedImport(null)
        return
      }

      setImportValidation('valid')
      setParsedImport(parsed)
    } catch {
      setImportValidation('invalid')
      setParsedImport(null)
    }
  }, [importText])

  const handleCopy = async () => {
    await copyTextWithFallback(clipboardContent)
    setCopySuccess(true)
    window.setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleApply = async () => {
    if (!parsedImport) return

    setImporting(true)
    setImportSuccess(null)
    setImportError(null)

    try {
      const response = await fetch('/api/market-snapshot/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedImport),
      })

      const result = (await response.json()) as ApplyResult

      if (!response.ok) {
        setImportError('error' in result ? result.error : 'Failed to apply update.')
        setImporting(false)
        return
      }

      if ('success' in result && result.success) {
        onApplySuccess?.({
          market_phase: result.market_phase,
          max_long_exposure_pct: result.max_long_exposure_pct,
          snapshot_date: result.snapshot_date,
        })

        setImportSuccess(
          `Market snapshot updated for ${result.snapshot_date}. Phase: ${result.market_phase}. Max exposure: ${result.max_long_exposure_pct}%.`
        )
        setImportText('')
        router.refresh()
      }
    } catch {
      setImportError('Failed to apply update.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="ui-section">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Step 1 — Copy Market Prompt
        </h2>
        <p className="mt-3 text-neutral-600 dark:text-[#a8b2bf]">
          Click copy. Open ChatGPT with web browsing enabled. Paste. ChatGPT
          will look up new 52-week highs and lows and return a JSON object.
        </p>

        <textarea
          readOnly
          value={clipboardPreview}
          className="ui-textarea mt-5 h-32 overflow-hidden font-mono text-xs text-neutral-500 dark:text-[#a8b2bf]"
        />

        <button
          type="button"
          onClick={handleCopy}
          className="ui-btn-primary mt-5"
        >
          {copySuccess ? 'Copied!' : 'Copy prompt'}
        </button>
      </div>

      <div className="ui-section">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Step 2 — Paste ChatGPT output
        </h2>
        <p className="mt-3 text-neutral-600 dark:text-[#a8b2bf]">
          Paste the JSON that ChatGPT returned. Click Apply to update the market
          snapshot.
        </p>

        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste ChatGPT's JSON output here..."
          className="ui-textarea mt-5 h-48"
        />

        <div className="mt-4 min-h-7">
          {importValidation === 'valid' && (
            <span className="ui-pill-success">Valid JSON — ready to apply</span>
          )}
          {importValidation === 'invalid' && (
            <span className="ui-pill-danger">
              Invalid JSON — check the output and try again
            </span>
          )}
          {importValidation === 'schema' && (
            <span className="ui-pill-warning">
              JSON structure does not match expected format
            </span>
          )}
        </div>

        {importValidation === 'valid' && parsedImport ? (
          <div className="mt-3 space-y-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 dark:border-[#2a313b] dark:bg-[#181d23] dark:text-[#a8b2bf]">
            <div>
              New highs: {parsedImport.new_highs_count === null ? 'null' : parsedImport.new_highs_count} · New lows:{' '}
              {parsedImport.new_lows_count === null ? 'null' : parsedImport.new_lows_count}
            </div>
          </div>
        ) : null}

        {importSuccess ? (
          <div className="mt-4 text-sm font-medium text-green-700 dark:text-[#8fd0ab]">
            {importSuccess}
          </div>
        ) : null}

        {importError ? (
          <div className="mt-4 text-sm font-medium text-red-700 dark:text-[#f0a3a3]">
            {importError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleApply}
          disabled={importValidation !== 'valid' || importing}
          className="ui-btn-primary mt-5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {importing ? 'Applying...' : 'Apply'}
        </button>
      </div>
    </div>
  )
}
