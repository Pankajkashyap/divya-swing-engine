'use client'

import { useState } from 'react'
import type { SavedTrade } from '@/app/page'

type Props = {
  savedTrades: SavedTrade[]
  onPartialExit: (
    tradeId: string,
    exitPrice: string,
    exitShares: string
  ) => void | Promise<void>
}

export function PartialExitTable({ savedTrades, onPartialExit }: Props) {
  const [exitPrices, setExitPrices] = useState<Record<string, string>>({})
  const [exitShares, setExitShares] = useState<Record<string, string>>({})

  const openTrades = savedTrades.filter(
    (trade) => trade.status === 'open' || trade.status === 'partial'
  )

  return (
      <div className="ui-section mt-8">
        <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Partial Exits</h2>
        <p className="text-sm text-neutral-500">{openTrades.length} active trades</p>
      </div>

      {openTrades.length === 0 ? (
        <p className="text-neutral-600">No active trades available for partial exits.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-3 pr-4">Ticker</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Entry Price</th>
                <th className="py-3 pr-4">Current Shares</th>
                <th className="py-3 pr-4">Exit Price</th>
                <th className="py-3 pr-4">Exit Shares</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {openTrades.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="py-3 pr-4 font-medium">{row.ticker}</td>
                  <td className="py-3 pr-4">{row.status}</td>
                  <td className="py-3 pr-4">{row.entry_price_actual ?? '—'}</td>
                  <td className="py-3 pr-4">{row.shares_entered ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <input
                      value={exitPrices[row.id] ?? ''}
                      onChange={(e) =>
                        setExitPrices((prev) => ({
                          ...prev,
                          [row.id]: e.target.value,
                        }))
                      }
                      className="w-24 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                      placeholder="price"
                    />
                  </td>
<td className="py-3 pr-4">
  <input
    value={exitShares[row.id] ?? ''}
    onChange={(e) =>
      setExitShares((prev) => ({
        ...prev,
        [row.id]: e.target.value,
      }))
    }
    className="w-24 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
    placeholder="shares"
  />
</td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() =>
                        onPartialExit(
                          row.id,
                          exitPrices[row.id] ?? '',
                          exitShares[row.id] ?? ''
                        )
                      }
                      className="ui-btn-secondary px-3 py-1 text-xs"
                    >
                      Partial Exit
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