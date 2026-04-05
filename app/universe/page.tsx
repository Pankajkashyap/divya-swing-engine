'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { AppHeader } from '@/components/AppHeader'
import { Tooltip } from '@/components/ui/Tooltip'

type UniverseRow = {
  id: string
  ticker: string
  company_name: string | null
  index_membership: string | null
  is_active: boolean
  updated_at: string
}

type BulkUpdateResponse = {
  upserted: number
  deactivated: number
  errors: string[]
}

type UniverseImportRow = {
  ticker: string
  company_name: string | null
  index_membership: string | null
}

function buildSP500Prompt(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `You are a financial data analyst. Return the current S&P 500
constituents as a clean JSON array.

STRICT OUTPUT RULES:
- Return ONLY a valid JSON array. No markdown, no explanation,
  no backticks, no preamble, no trailing text.
- Every element must have exactly three fields:
  ticker, company_name, index_membership
- index_membership must be exactly: "S&P 500"
- Do not add, rename, or remove any fields.

QUALITY RULES:
- Only include stocks that are CONFIRMED current S&P 500
  constituents as of today.
- If you are not certain a ticker is in the S&P 500, omit it
  entirely. Do not guess. An omission is better than a wrong entry.
- Do not include ETFs, funds, warrants, or non-equity instruments.
- Do not include any ticker you cannot verify with a real
  company name from a reliable source.
- The S&P 500 contains approximately 503 tickers. If your list
  is significantly shorter (below 450) or longer (above 520),
  re-check your source before returning.

RESEARCH INSTRUCTIONS:
Using your web browsing capability, look up the current official
S&P 500 constituent list from a reliable source such as:
- Wikipedia "List of S&P 500 companies"
- S&P Global official constituent list
- Slickcharts.com S&P 500 list

Use the official US exchange ticker symbol for each company.

SELF-CHECK BEFORE RETURNING:
Count your entries. If the count is below 450 or above 520,
stop and re-fetch the source. Return only after confirming
the count is in range.

TODAY'S DATE: ${today}

RETURN THIS EXACT STRUCTURE (no other text):
[
  {
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "index_membership": "S&P 500"
  }
]`
}

function buildNASDAQ100Prompt(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `You are a financial data analyst. Return the current NASDAQ 100
constituents as a clean JSON array.

STRICT OUTPUT RULES:
- Return ONLY a valid JSON array. No markdown, no explanation,
  no backticks, no preamble, no trailing text.
- Every element must have exactly three fields:
  ticker, company_name, index_membership
- index_membership must be exactly: "NASDAQ 100"
- Do not add, rename, or remove any fields.

QUALITY RULES:
- Only include stocks that are CONFIRMED current NASDAQ 100
  constituents as of today.
- If you are not certain a ticker is in the NASDAQ 100, omit it
  entirely. Do not guess. An omission is better than a wrong entry.
- Do not include ETFs, funds, warrants, or non-equity instruments.
- Do not include any ticker you cannot verify with a real
  company name from a reliable source.
- The NASDAQ 100 contains approximately 101 tickers. If your list
  is significantly outside this range, re-check your source.

RESEARCH INSTRUCTIONS:
Using your web browsing capability, look up the current official
NASDAQ 100 constituent list from a reliable source such as:
- Wikipedia "Nasdaq-100"
- Nasdaq official site
- Slickcharts.com NASDAQ 100 list

Use the official US exchange ticker symbol for each company.

SELF-CHECK BEFORE RETURNING:
Count your entries. If the count is below 95 or above 110,
stop and re-fetch the source before returning.

TODAY'S DATE: ${today}

RETURN THIS EXACT STRUCTURE (no other text):
[
  {
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "index_membership": "NASDAQ 100"
  }
]`
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

function isValidUniverseImportRow(row: unknown): row is UniverseImportRow {
  if (typeof row !== 'object' || row === null) return false

  const r = row as Record<string, unknown>
  if (typeof r.ticker !== 'string' || !r.ticker.trim()) return false

  const companyNameOk =
    r.company_name === null ||
    r.company_name === undefined ||
    typeof r.company_name === 'string'

  const indexMembershipOk =
    r.index_membership === null ||
    r.index_membership === undefined ||
    typeof r.index_membership === 'string'

  return companyNameOk && indexMembershipOk
}

export default function UniversePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [rows, setRows] = useState<UniverseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [copySP500Success, setCopySP500Success] = useState(false)
  const [copyNASDAQSuccess, setCopyNASDAQSuccess] = useState(false)

  const [importText, setImportText] = useState('')
  const [parsedImport, setParsedImport] = useState<UniverseImportRow[] | null>(null)
  const [importValidation, setImportValidation] = useState<
    'empty' | 'valid' | 'invalid' | 'schema'
  >('empty')
  const [applying, setApplying] = useState(false)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  const loadUniverse = useMemo(
    () => async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('ticker_universe')
        .select('id, ticker, company_name, index_membership, is_active, updated_at')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Universe load error:', error)
        setRows([])
        setLoading(false)
        return
      }

      setRows((data ?? []) as UniverseRow[])
      setLoading(false)
    },
    [supabase]
  )

  useEffect(() => {
    void loadUniverse()
  }, [loadUniverse])

  useEffect(() => {
    setApplySuccess(null)
    setApplyError(null)

    if (!importText.trim()) {
      setImportValidation('empty')
      setParsedImport(null)
      return
    }

    try {
      const parsed = JSON.parse(importText) as unknown

      if (!Array.isArray(parsed)) {
        setImportValidation('schema')
        setParsedImport(null)
        return
      }

      const valid = parsed.every(isValidUniverseImportRow)

      if (!valid) {
        setImportValidation('schema')
        setParsedImport(null)
        return
      }

      const normalized = parsed.map((row) => ({
        ticker: row.ticker.trim().toUpperCase(),
        company_name: row.company_name ?? null,
        index_membership: row.index_membership ?? null,
      }))

      setImportValidation('valid')
      setParsedImport(normalized)
    } catch {
      setImportValidation('invalid')
      setParsedImport(null)
    }
  }, [importText])

  const sp500PromptText = useMemo(() => buildSP500Prompt(), [])
  const nasdaqPromptText = useMemo(() => buildNASDAQ100Prompt(), [])

  const sp500PromptPreview = useMemo(
    () => sp500PromptText.split('\n').slice(0, 3).join('\n'),
    [sp500PromptText]
  )
  const nasdaqPromptPreview = useMemo(
    () => nasdaqPromptText.split('\n').slice(0, 3).join('\n'),
    [nasdaqPromptText]
  )

  const activeCount = useMemo(
    () => rows.filter((row) => row.is_active).length,
    [rows]
  )

  const lastUpdated = useMemo(() => {
    if (rows.length === 0) return 'Never'
    return new Date(rows[0].updated_at).toLocaleString()
  }, [rows])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows

    return rows.filter((row) => {
      const ticker = row.ticker.toLowerCase()
      const company = row.company_name?.toLowerCase() ?? ''
      return ticker.includes(term) || company.includes(term)
    })
  }, [rows, search])

  const handleCopySP500 = async () => {
    await copyTextWithFallback(sp500PromptText)
    setCopySP500Success(true)
    window.setTimeout(() => setCopySP500Success(false), 2000)
  }

  const handleCopyNASDAQ = async () => {
    await copyTextWithFallback(nasdaqPromptText)
    setCopyNASDAQSuccess(true)
    window.setTimeout(() => setCopyNASDAQSuccess(false), 2000)
  }

  const handleApply = async () => {
    if (!parsedImport) return

    setApplying(true)
    setApplySuccess(null)
    setApplyError(null)

    try {
      const response = await fetch('/api/ticker-universe/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedImport),
      })

      const result = (await response.json()) as BulkUpdateResponse

      if (!response.ok) {
        setApplyError(result.errors?.[0] ?? 'Failed to update universe.')
        setApplying(false)
        return
      }

      setApplySuccess(`Universe updated. ${parsedImport.length} tickers active.`)
      setImportText('')
      await loadUniverse()
    } catch {
      setApplyError('Failed to update universe.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <main className="ui-page">
      <section className="mx-auto max-w-7xl">
        <AppHeader
          title="Universe"
          subtitle="Manage the ticker universe the screener draws from."
        />

        {loading ? (
          <div className="mt-8 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            Loading universe...
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="ui-card p-6">
                <div className="flex items-center gap-1 text-sm uppercase tracking-wide text-neutral-500 dark:text-[#a8b2bf]">
                  Active tickers
                  <Tooltip text="The number of stocks currently in the screener universe. The screener randomly samples from this list each night." />
                </div>
                <div className="mt-2 text-4xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  {activeCount}
                </div>
              </div>

              <div className="ui-card p-6">
                <div className="flex items-center gap-1 text-sm uppercase tracking-wide text-neutral-500 dark:text-[#a8b2bf]">
                  Last updated
                  <Tooltip text="The last time the ticker universe was refreshed from a ChatGPT index pull." />
                </div>
                <div className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  {lastUpdated}
                </div>
              </div>

              <div className="ui-card p-6">
                <div className="flex items-center gap-1 text-sm uppercase tracking-wide text-neutral-500 dark:text-[#a8b2bf]">
                  Index coverage
                  <Tooltip text="The indices whose constituents make up the universe. Update quarterly or after major index rebalancing." />
                </div>
                <div className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  <div>S&amp;P 500</div>
                  <div>NASDAQ 100</div>
                  <div className="text-sm font-normal text-neutral-500 dark:text-[#a8b2bf] mt-1">
                    Applied separately
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="ui-section">
                <h2 className="text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  Step 1 — Copy prompts
                </h2>
                <p className="mt-3 text-neutral-600 dark:text-[#a8b2bf]">
                  Run both prompts separately in ChatGPT with web browsing enabled.
                  Paste each result into Step 2 and apply one at a time.
                </p>

                <div className="mt-5 space-y-4">
                  <div className="ui-card p-4">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      S&amp;P 500
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      ~503 tickers. Paste result into Step 2, then apply.
                    </p>

                    <textarea
                      readOnly
                      value={sp500PromptPreview}
                      className="ui-textarea mt-4 h-20 overflow-hidden font-mono text-xs text-neutral-500 dark:text-[#a8b2bf]"
                    />

                    <button
                      type="button"
                      onClick={handleCopySP500}
                      className="ui-btn-secondary mt-4"
                    >
                      {copySP500Success ? 'Copied!' : 'Copy S&P 500 prompt'}
                    </button>
                  </div>

                  <div className="ui-card p-4">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                      NASDAQ 100
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
                      ~101 tickers. Run after S&amp;P 500. Apply separately.
                    </p>

                    <textarea
                      readOnly
                      value={nasdaqPromptPreview}
                      className="ui-textarea mt-4 h-20 overflow-hidden font-mono text-xs text-neutral-500 dark:text-[#a8b2bf]"
                    />

                    <button
                      type="button"
                      onClick={handleCopyNASDAQ}
                      className="ui-btn-secondary mt-4"
                    >
                      {copyNASDAQSuccess ? 'Copied!' : 'Copy NASDAQ 100 prompt'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="ui-section">
                <h2 className="text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  Step 2 — Paste ChatGPT output
                </h2>
                <p className="mt-3 text-neutral-600 dark:text-[#a8b2bf]">
                  Paste the JSON array ChatGPT returned for either prompt.
                  Click Apply. Run both prompts and apply each one separately
                  to build the full universe.
                </p>

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste ChatGPT's JSON output here..."
                  className="ui-textarea mt-5 h-48"
                />

                <div className="mt-4 min-h-7">
                  {importValidation === 'valid' && parsedImport && (
                    <span className="ui-pill-success">
                      Valid JSON — {parsedImport.length} tickers ready to apply
                    </span>
                  )}
                  {importValidation === 'invalid' && (
                    <span className="ui-pill-danger">
                      Invalid JSON — check the output
                    </span>
                  )}
                  {importValidation === 'schema' && (
                    <span className="ui-pill-warning">
                      JSON structure does not match expected format
                    </span>
                  )}
                </div>

                {applySuccess ? (
                  <div className="mt-4 text-sm font-medium text-green-700 dark:text-[#8fd0ab]">
                    {applySuccess}
                  </div>
                ) : null}

                {applyError ? (
                  <div className="mt-4 text-sm font-medium text-red-700 dark:text-[#f0a3a3]">
                    {applyError}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleApply}
                  disabled={importValidation !== 'valid' || applying}
                  className="ui-btn-primary mt-5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applying ? 'Applying...' : 'Apply update'}
                </button>
              </div>
            </div>

            <section className="ui-section mt-8">
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  Ticker Universe
                </h2>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tickers..."
                  className="ui-input md:w-72"
                />
              </div>

              {filteredRows.length === 0 ? (
                <p className="text-neutral-600 dark:text-[#a8b2bf]">
                  No tickers found.
                </p>
              ) : (
                <div className="ui-table-wrap">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>Ticker</th>
                        <th>Company Name</th>
                        <th>Index Membership</th>
                        <th>Status</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr key={row.id}>
                          <td className="font-medium">{row.ticker}</td>
                          <td>{row.company_name ?? '—'}</td>
                          <td>{row.index_membership ?? '—'}</td>
                          <td>
                            {row.is_active ? (
                              <span className="ui-pill-success">Active</span>
                            ) : (
                              <span className="ui-pill-neutral">Inactive</span>
                            )}
                          </td>
                          <td>{new Date(row.updated_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  )
}