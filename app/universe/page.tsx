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

function buildUniversePrompt() {
  const today = new Date().toISOString().slice(0, 10)

  return `You are a financial data analyst. Your job is to return the
current constituents of the S&P 500 and NASDAQ 100 indices
as a clean JSON array.

STRICT OUTPUT RULES:
- Return ONLY a valid JSON array. No markdown, no explanation,
  no backticks, no preamble, no trailing text.
- Every element must be an object with exactly these three fields:
  ticker, company_name, index_membership
- Do not add, rename, or remove any fields.

RESEARCH INSTRUCTIONS:
Using your web browsing capability, look up the current
official constituent lists for:
1. S&P 500 — all 503 tickers (some share classes count separately)
2. NASDAQ 100 — all 100 tickers

For each stock:
- ticker: the official US exchange ticker symbol (e.g. "AAPL")
- company_name: the full official company name (e.g. "Apple Inc.")
- index_membership: which index or indices this ticker belongs to.
  Use one of:
  "S&P 500" — in S&P 500 only
  "NASDAQ 100" — in NASDAQ 100 only
  "S&P 500, NASDAQ 100" — in both

DEDUPLICATION:
If a ticker appears in both indices, include it ONCE with
index_membership set to "S&P 500, NASDAQ 100".

RETURN THIS EXACT STRUCTURE:
[
  {
    "ticker": "AAPL",
    "company_name": "Apple Inc.",
    "index_membership": "S&P 500, NASDAQ 100"
  },
  {
    "ticker": "NSC",
    "company_name": "Norfolk Southern Corp.",
    "index_membership": "S&P 500"
  }
]

Do not include ETFs, funds, or non-equity instruments.
Today's date is: ${today}`
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

  const [copySuccess, setCopySuccess] = useState(false)
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

  const promptText = useMemo(() => buildUniversePrompt(), [])
  const promptPreview = useMemo(
    () => promptText.split('\n').slice(0, 3).join('\n'),
    [promptText]
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

  const handleCopy = async () => {
    await copyTextWithFallback(promptText)
    setCopySuccess(true)
    window.setTimeout(() => setCopySuccess(false), 2000)
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
                  S&amp;P 500 + NASDAQ 100
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="ui-section">
                <h2 className="text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                  Step 1 — Copy Universe Prompt
                </h2>
                <p className="mt-3 text-neutral-600 dark:text-[#a8b2bf]">
                  Click copy. Open ChatGPT with web browsing enabled. Paste. ChatGPT
                  will return the current index constituents as JSON.
                </p>

                <textarea
                  readOnly
                  value={promptPreview}
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
                  Paste the JSON array ChatGPT returned. Click Apply to update the
                  universe.
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