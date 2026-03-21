import type { WatchlistRow } from '@/app/page'

type Props = {
  watchlist: WatchlistRow[]
  stock: WatchlistRow | null
  onSelect: (row: WatchlistRow) => void
}

export function WatchlistSelectionTable({ watchlist, stock, onSelect }: Props) {
  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Watchlist Selection</h2>
        <p className="text-sm text-neutral-500">{watchlist.length} records</p>
      </div>

      {watchlist.length === 0 ? (
        <p className="text-neutral-600">No watchlist names available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-3 pr-4">Select</th>
                <th className="py-3 pr-4">Ticker</th>
                <th className="py-3 pr-4">Company</th>
                <th className="py-3 pr-4">Grade</th>
                <th className="py-3 pr-4">R/R</th>
                <th className="py-3 pr-4">Entry Zone</th>
                <th className="py-3 pr-4">Stop</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((row) => {
                const isSelected = stock?.id === row.id

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-neutral-100 ${isSelected ? 'bg-neutral-50' : ''}`}
                  >
                    <td className="py-3 pr-4">
                      <button
                        onClick={() => onSelect(row)}
                        className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium"
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </td>
                    <td className="py-3 pr-4 font-medium">{row.ticker}</td>
                    <td className="py-3 pr-4">{row.company_name ?? '—'}</td>
                    <td className="py-3 pr-4">{row.setup_grade ?? '—'}</td>
                    <td className="py-3 pr-4">{row.rr_ratio ?? '—'}</td>
                    <td className="py-3 pr-4">
                      {row.entry_zone_low ?? '—'} - {row.entry_zone_high ?? '—'}
                    </td>
                    <td className="py-3 pr-4">{row.stop_price ?? '—'}</td>
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