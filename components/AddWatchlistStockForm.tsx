'use client'

import { useState } from 'react'

type Props = {
  onAdd: (payload: {
    ticker: string
    companyName: string
    setupGrade: string
    rrRatio: string
    entryZoneLow: string
    entryZoneHigh: string
    stopPrice: string
  }) => void | Promise<void>
}

export function AddWatchlistStockForm({ onAdd }: Props) {
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [setupGrade, setSetupGrade] = useState('A')
  const [rrRatio, setRrRatio] = useState('')
  const [entryZoneLow, setEntryZoneLow] = useState('')
  const [entryZoneHigh, setEntryZoneHigh] = useState('')
  const [stopPrice, setStopPrice] = useState('')

  const handleSubmit = async () => {
    await onAdd({
      ticker,
      companyName,
      setupGrade,
      rrRatio,
      entryZoneLow,
      entryZoneHigh,
      stopPrice,
    })

    setTicker('')
    setCompanyName('')
    setSetupGrade('A')
    setRrRatio('')
    setEntryZoneLow('')
    setEntryZoneHigh('')
    setStopPrice('')
  }

  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
      <h2 className="text-lg font-semibold">Add Watchlist Stock</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Ticker</label>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="NVDA"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Company Name</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="NVIDIA Corp."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Setup Grade</label>
          <select
            value={setupGrade}
            onChange={(e) => setSetupGrade(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="A+">A+</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">R/R Ratio</label>
          <input
            value={rrRatio}
            onChange={(e) => setRrRatio(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="2.5"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Entry Zone Low</label>
          <input
            value={entryZoneLow}
            onChange={(e) => setEntryZoneLow(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Entry Zone High</label>
          <input
            value={entryZoneHigh}
            onChange={(e) => setEntryZoneHigh(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="105"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Stop Price</label>
          <input
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="95"
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSubmit}
          className="rounded-xl border border-neutral-900 px-5 py-3 text-sm font-medium"
        >
          Add to Watchlist
        </button>
      </div>
    </div>
  )
}