import type { SavedTrade } from '@/app/page'

type Props = {
  savedTrades: SavedTrade[]
}

export function OpenTradesTable({ savedTrades }: Props) {
  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Open Trades</h2>
        <p className="text-sm text-neutral-500">{savedTrades.length} records</p>
      </div>

      {savedTrades.length === 0 ? (
        <p className="text-neutral-600">No trades created yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-3 pr-4">Ticker</th>
                <th className="py-3 pr-4">Side</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Entry Date</th>
                <th className="py-3 pr-4">Entry Price</th>
                <th className="py-3 pr-4">Shares</th>
                <th className="py-3 pr-4">Initial Stop</th>
                <th className="py-3 pr-4">Target 1</th>
                <th className="py-3 pr-4">Target 2</th>
              </tr>
            </thead>
            <tbody>
              {savedTrades.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="py-3 pr-4 font-medium">{row.ticker}</td>
                  <td className="py-3 pr-4">{row.side}</td>
                  <td className="py-3 pr-4">{row.status}</td>
                  <td className="py-3 pr-4">{row.entry_date ?? '—'}</td>
                  <td className="py-3 pr-4">{row.entry_price_actual ?? '—'}</td>
                  <td className="py-3 pr-4">{row.shares_entered ?? '—'}</td>
                  <td className="py-3 pr-4">{row.stop_price_initial ?? '—'}</td>
                  <td className="py-3 pr-4">{row.target_1_price ?? '—'}</td>
                  <td className="py-3 pr-4">{row.target_2_price ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}