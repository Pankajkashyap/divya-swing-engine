'use client'

import { useState } from 'react'
import type { SavedTrade } from '@/app/trading/types/dashboard'

type Props = {
  savedTrades: SavedTrade[]
  onCloseTrade: (tradeId: string, exitPrice: string) => void | Promise<void>
}

export function TradeManagementTable({
  savedTrades,
  onCloseTrade,
}: Props) {
  const [exitPrices, setExitPrices] = useState<Record<string, string>>({})

  return (
    <div className="ui-section mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Trade Management
        </h2>
        <p className="text-sm text-neutral-500 dark:text-[#a8b2bf]">
          {savedTrades.length} records
        </p>
      </div>

      {savedTrades.length === 0 ? (
        <p className="text-neutral-600 dark:text-[#a8b2bf]">
          No trades created yet.
        </p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Side</th>
                <th>Status</th>
                <th>Entry Date</th>
                <th>Entry Price</th>
                <th>Shares</th>
                <th>Initial Stop</th>
                <th>Target 1</th>
                <th>Target 2</th>
                <th>Exit Price</th>
                <th>Exit Date</th>
                <th>P&amp;L $</th>
                <th>P&amp;L %</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {savedTrades.map((row) => {
                const isOpen = row.status === 'open' || row.status === 'partial'

                return (
                  <tr key={row.id}>
                    <td className="py-3 pr-4 font-medium">{row.ticker}</td>
                    <td className="py-3 pr-4">{row.side}</td>
                    <td className="py-3 pr-4">{row.status}</td>
                    <td className="py-3 pr-4">{row.entry_date ?? '—'}</td>
                    <td className="py-3 pr-4">{row.entry_price_actual ?? '—'}</td>
                    <td className="py-3 pr-4">{row.shares_entered ?? '—'}</td>
                    <td className="py-3 pr-4">{row.stop_price_initial ?? '—'}</td>
                    <td className="py-3 pr-4">{row.target_1_price ?? '—'}</td>
                    <td className="py-3 pr-4">{row.target_2_price ?? '—'}</td>
                    <td className="py-3 pr-4">
                      {isOpen ? (
                        <input
                          value={exitPrices[row.id] ?? ''}
                          onChange={(e) =>
                            setExitPrices((prev) => ({
                              ...prev,
                              [row.id]: e.target.value,
                            }))
                          }
                          className="ui-input w-24 px-2 py-1 text-sm"
                          placeholder="105"
                        />
                      ) : (
                        row.exit_price_actual ?? '—'
                      )}
                    </td>
                    <td className="py-3 pr-4">{row.exit_date ?? '—'}</td>
                    <td className="py-3 pr-4">{row.pnl_dollar ?? '—'}</td>
                    <td className="py-3 pr-4">{row.pnl_pct ?? '—'}</td>
                    <td className="py-3 pr-4">
                      {isOpen ? (
                        <button
                          onClick={() => onCloseTrade(row.id, exitPrices[row.id] ?? '')}
                          className="ui-btn-secondary px-3 py-1 text-xs"
                        >
                          Close Trade
                        </button>
                      ) : (
                        'Closed'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}