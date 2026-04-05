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
    <div className="ui-section mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Stop Updates
        </h2>
        <p className="text-sm text-neutral-500 dark:text-[#a8b2bf]">
          {openTrades.length} open trades
        </p>
      </div>

      {openTrades.length === 0 ? (
        <p className="text-neutral-600 dark:text-[#a8b2bf]">
          No open trades available for stop updates.
        </p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Status</th>
                <th>Entry Price</th>
                <th>Initial Stop</th>
                <th>Current Stop</th>
                <th>New Stop</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {openTrades.map((row) => (
                <tr key={row.id}>
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
                      className="ui-input w-24 px-2 py-1 text-sm"
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