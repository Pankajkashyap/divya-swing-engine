'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type RawMarketData = {
  spy_price: number
  spy_change_pct: number
  spy_above_50dma: boolean
  spy_above_150dma: boolean
  spy_above_200dma: boolean
  spy_200dma_trending_up: boolean
  distribution_days: number
  ftd_active: boolean
  ftd_invalidated: boolean
  new_highs_count: number
  new_lows_count: number
  leading_sectors: string
}

type ApplyResult =
  | {
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
  | { error: string }

function buildClipboardContent(): string {
  const today = new Date().toISOString().slice(0, 10)

  return `You are a financial data researcher. Your only job is to look up current market data and return it as a JSON object. You do NOT determine market phase, exposure, or make any judgement calls. You collect raw facts only.

STRICT OUTPUT RULES:
- Return ONLY a valid JSON object. No markdown, no explanation, no backticks, no preamble, no trailing text.
- All fields must be present. Do not add, rename, or remove any fields.
- Return null for any field you cannot determine with confidence — do not guess.

RESEARCH INSTRUCTIONS — look up the following for TODAY (${today}):

1. SPY price and daily change:
   - Current SPY price (closing price or latest price if market is open)
   - SPY % change today

2. SPY moving averages:
   - Is SPY currently trading ABOVE its 50-day simple moving average? (true/false)
   - Is SPY currently trading ABOVE its 150-day simple moving average? (true/false)
   - Is SPY currently trading ABOVE its 200-day simple moving average? (true/false)
   - Has the 200-day simple moving average been trending UPWARD for at least the past month? (true/false)

3. Distribution days (count carefully):
   - Look at each of the last 25 trading sessions on SPY
   - A distribution day = SPY closed DOWN 0.2% or more AND volume was HIGHER than the prior session
   - Count only sessions within the last 25. Do not include older sessions.
   - Return the total count as an integer.

4. Follow-Through Day:
   - Is there a currently active Follow-Through Day? (FTD = on day 4 or later of a rally attempt, SPY or QQQ closed UP 1.7% or more on higher volume than the prior session)
   - Has that FTD been invalidated? (invalidated = subsequent distribution cluster of 3+ days within 5 sessions, OR market undercut the low of the rally attempt that preceded the FTD)
   - Return ftd_active: true only if an FTD occurred and has NOT been invalidated
   - Return ftd_invalidated: true if an FTD occurred but was subsequently invalidated

5. Market breadth:
   - How many stocks made new 52-week highs today on NYSE + NASDAQ combined? (integer)
   - How many stocks made new 52-week lows today on NYSE + NASDAQ combined? (integer)

6. Sector leadership:
   - Which 2-3 sectors are showing the strongest relative strength right now?
   - Return as a comma-separated string

TODAY'S DATE: ${today}

RETURN THIS EXACT JSON STRUCTURE — raw data only, no phase determination:
{
  "spy_price": 0.00,
  "spy_change_pct": 0.00,
  "spy_above_50dma": true,
  "spy_above_150dma": true,
  "spy_above_200dma": true,
  "spy_200dma_trending_up": true,
  "distribution_days": 0,
  "ftd_active": true,
  "ftd_invalidated": false,
  "new_highs_count": 0,
  "new_lows_count": 0,
  "leading_sectors": "Technology, Healthcare"
}`
}

function isValidRawData(row: unknown): row is RawMarketData {
  if (typeof row !== 'object' || row === null) return false
  const r = row as Record<string, unknown>

  return (
    typeof r.spy_price === 'number' && r.spy_price > 0 &&
    typeof r.spy_change_pct === 'number' &&
    typeof r.spy_above_50dma === 'boolean' &&
    typeof r.spy_above_150dma === 'boolean' &&
    typeof r.spy_above_200dma === 'boolean' &&
    typeof r.spy_200dma_trending_up === 'boolean' &&
    typeof r.distribution_days === 'number' && r.distribution_days >= 0 &&
    typeof r.ftd_active === 'boolean' &&
    typeof r.ftd_invalidated === 'boolean' &&
    typeof r.new_highs_count === 'number' && r.new_highs_count >= 0 &&
    typeof r.new_lows_count === 'number' && r.new_lows_count >= 0 &&
    typeof r.leading_sectors === 'string' && r.leading_sectors.trim().length > 0
  )
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

export function MarketSnapshotChatGPTWorkflow() {
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
          will research the current market and return a JSON assessment.
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
            <div>SPY: ${parsedImport.spy_price} ({parsedImport.spy_change_pct > 0 ? '+' : ''}{parsedImport.spy_change_pct}%)</div>
            <div>MAs: 50d {parsedImport.spy_above_50dma ? '✓' : '✗'} · 150d {parsedImport.spy_above_150dma ? '✓' : '✗'} · 200d {parsedImport.spy_above_200dma ? '✓' : '✗'} · 200d trend {parsedImport.spy_200dma_trending_up ? '↑' : '↓'}</div>
            <div>Distribution days: {parsedImport.distribution_days} · FTD: {parsedImport.ftd_active ? 'Active' : 'None'} · Invalidated: {parsedImport.ftd_invalidated ? 'Yes' : 'No'}</div>
            <div>New highs: {parsedImport.new_highs_count} · New lows: {parsedImport.new_lows_count}</div>
            <div>Leading sectors: {parsedImport.leading_sectors}</div>
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