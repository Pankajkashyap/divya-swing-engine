'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type MarketSnapshotPayload = {
  market_phase:
    | 'confirmed_uptrend'
    | 'under_pressure'
    | 'rally_attempt'
    | 'correction'
    | 'bear'
  max_long_exposure_pct: number
  spy_price: number
  spy_change_pct: number
  spy_above_50dma: boolean
  spy_above_150dma: boolean
  spy_above_200dma: boolean
  distribution_days: number
  ftd_active: boolean
  leading_sectors: string
  reasoning: string
}

type ApplyResult =
  | {
      success: true
      market_phase: MarketSnapshotPayload['market_phase']
      max_long_exposure_pct: number
      snapshot_date: string
    }
  | { error: string }

function buildClipboardContent(): string {
  const today = new Date().toISOString().slice(0, 10)

  return `You are a professional market analyst specialising in Mark Minervini's SEPA® methodology and IBD market timing. Your job is to assess the current broad market condition and return a structured JSON that will be used to configure a swing trading system.

STRICT OUTPUT RULES:
- Return ONLY a valid JSON object. No markdown, no explanation, no backticks, no preamble.
- All fields must be present. Do not add, rename, or remove any fields.

RESEARCH INSTRUCTIONS:
Using your web browsing capability, look up the following for TODAY:

1. SPY and QQQ:
   - Current price and % change today
   - 50-day, 150-day, and 200-day moving averages
   - Whether price is above or below each MA
   - 52-week high and 52-week low

2. Distribution Days:
   - Count the number of distribution days on SPY over the last 25 trading sessions
   - A distribution day = SPY closes DOWN 0.2% or more on HIGHER volume than the prior session
   - Count only days in the last 25 sessions. Discard any older than 25 sessions.

3. Follow-Through Day:
   - Determine if a valid Follow-Through Day (FTD) is currently active
   - FTD = on day 4 or later of a rally attempt, a major index closes UP 1.7%+ on higher volume than prior session
   - Has this FTD been invalidated by a subsequent distribution cluster or undercut of rally lows?

4. Market Breadth:
   - Are more stocks making new 52-week highs or lows?
   - Is the advance/decline line trending up or down?

5. Sector Leadership:
   - Which 2-3 sectors are showing the strongest relative strength right now?
   - Are leading stocks breaking out or failing?

PHASE DETERMINATION RULES:
Use the following rules strictly to determine market_phase:

"confirmed_uptrend":
- FTD is active and not invalidated
- Distribution days: 0-3
- SPY above 50-day, 150-day, and 200-day MA
- More new highs than new lows
- Leading stocks breaking out successfully

"under_pressure":
- Distribution days: 4-5
- OR SPY below 50-day MA but above 150-day MA
- OR FTD active but showing signs of stalling
- Leading stocks having mixed results

"rally_attempt":
- Market sold off and is bouncing
- No confirmed FTD yet
- SPY attempting to reclaim key MAs
- Wait for FTD before committing capital

"correction":
- Distribution days: 5+
- OR SPY below 50-day and 150-day MA
- OR FTD has been invalidated
- Avoid new long entries

"bear":
- SPY below all three MAs (50, 150, 200-day)
- 200-day MA trending down
- New lows swamping new highs
- Leading stocks breaking down
- No new long entries under any circumstances

MAX LONG EXPOSURE RULES:
- confirmed_uptrend: 100
- under_pressure: 50
- rally_attempt: 25
- correction: 0
- bear: 0

TODAY'S DATE: ${today}

RETURN THIS EXACT JSON STRUCTURE:
{
  "market_phase": "confirmed_uptrend",
  "max_long_exposure_pct": 100,
  "spy_price": 0.00,
  "spy_change_pct": 0.00,
  "spy_above_50dma": true,
  "spy_above_150dma": true,
  "spy_above_200dma": true,
  "distribution_days": 0,
  "ftd_active": true,
  "leading_sectors": "Technology, Healthcare",
  "reasoning": "2-3 sentence summary of why this phase was chosen"
}`
}

function isValidMarketSnapshotJson(
  row: unknown
): row is MarketSnapshotPayload {
  if (typeof row !== 'object' || row === null) return false

  const r = row as Record<string, unknown>
  const validPhases = [
    'confirmed_uptrend',
    'under_pressure',
    'rally_attempt',
    'correction',
    'bear',
  ]
  const validExposures = [0, 25, 50, 100]

  if (!validPhases.includes(r.market_phase as string)) return false
  if (!validExposures.includes(r.max_long_exposure_pct as number)) return false
  if (typeof r.spy_price !== 'number' || r.spy_price <= 0) return false
  if (typeof r.spy_change_pct !== 'number') return false
  if (typeof r.spy_above_50dma !== 'boolean') return false
  if (typeof r.spy_above_150dma !== 'boolean') return false
  if (typeof r.spy_above_200dma !== 'boolean') return false
  if (
    typeof r.distribution_days !== 'number' ||
    r.distribution_days < 0 ||
    !Number.isInteger(r.distribution_days)
  ) {
    return false
  }
  if (typeof r.ftd_active !== 'boolean') return false
  if (typeof r.leading_sectors !== 'string' || !r.leading_sectors.trim()) {
    return false
  }
  if (typeof r.reasoning !== 'string' || !r.reasoning.trim()) return false

  return true
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
  const [parsedImport, setParsedImport] = useState<MarketSnapshotPayload | null>(
    null
  )
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

      if (!isValidMarketSnapshotJson(parsed)) {
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
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-2xl font-semibold">Step 1 — Copy Market Prompt</h2>
        <p className="mt-3 text-neutral-600">
          Click copy. Open ChatGPT with web browsing enabled. Paste. ChatGPT
          will research the current market and return a JSON assessment.
        </p>

        <textarea
          readOnly
          value={clipboardPreview}
          className="mt-5 h-32 w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-xs text-neutral-500"
        />

        <button
          type="button"
          onClick={handleCopy}
          className="ui-btn-primary mt-5"
        >
          {copySuccess ? 'Copied!' : 'Copy prompt'}
        </button>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-2xl font-semibold">Step 2 — Paste ChatGPT output</h2>
        <p className="mt-3 text-neutral-600">
          Paste the JSON that ChatGPT returned. Click Apply to update the market
          snapshot.
        </p>

        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste ChatGPT's JSON output here..."
          className="mt-5 h-48 w-full rounded-xl border border-neutral-200 p-4 text-sm"
        />

        <div className="mt-4 min-h-7">
          {importValidation === 'valid' && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              Valid JSON — ready to apply
            </span>
          )}
          {importValidation === 'invalid' && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
              Invalid JSON — check the output and try again
            </span>
          )}
          {importValidation === 'schema' && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
              JSON structure does not match expected format
            </span>
          )}
        </div>

        {importSuccess ? (
          <div className="mt-4 text-sm font-medium text-green-700">
            {importSuccess}
          </div>
        ) : null}

        {importError ? (
          <div className="mt-4 text-sm font-medium text-red-700">
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