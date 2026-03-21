'use client'

import { useState } from 'react'
import type { SavedTrade } from '@/app/page'

type Props = {
  savedTrades: SavedTrade[]
  onUpdateStop: (tradeId: string, newStopPrice: string) => void | Promise<void>
}

export function StopUpdateTable({ savedTrades, onUpdateStop }: Props) {
  const [stopInputs, setStopInputs] = useState<Record<string, string>>({})

  const openTrades = savedTrades.filter(
    (trade) => trade.status === 'open' || trade.status === 'partial'
  )

  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Stop Updates</h2>
        <p className="text-sm text-neutral-500">{openTrades.length} open trades</p>
      </div>

      {openTrades.length === 0 ? (
        <p className="text-neutral-600">No open trades available for stop updates.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-3 pr-4">Ticker</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Entry Price</th>
                <th className="py-3 pr-4">Initial Stop</th>
                <th className="py-3 pr-4">Current Stop</th>
                <th className="py-3 pr-4">New Stop</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {openTrades.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="py-3 pr-4 font-medium">{row.ticker}</td>
                  <td className="py-3 pr-4">{row.status}</td>
                  <td className="py-3 pr-4">{row.entry_price_actual ?? '—'}</td>
                  <td className="py-3 pr-4">{row.stop_price_initial ?? '—'}</td>
                  <td className="py-3 pr-4">{row.stop_price_current ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <input
                      value={stopInputs[row.id] ?? ''}
                      onChange={(e) =>
                        setStopInputs((prev) => ({
                          ...prev,
                          [row.id]: e.target.value,
                        }))
                      }
                      className="w-24 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                      placeholder="new stop"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => onUpdateStop(row.id, stopInputs[row.id] ?? '')}
                      className="ui-btn-secondary px-3 py-1 text-xs"
                    >
                      Update Stop
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}