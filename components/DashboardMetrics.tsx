type Props = {
  watchlistCount: number
  openTradesCount: number
  closedTradesCount: number
  totalRealizedPnl: number
}

export function DashboardMetrics({
  watchlistCount,
  openTradesCount,
  closedTradesCount,
  totalRealizedPnl,
}: Props) {
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-4">
      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Watchlist Names</h2>
        <p className="mt-2 text-2xl font-semibold">{watchlistCount}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Open Trades</h2>
        <p className="mt-2 text-2xl font-semibold">{openTradesCount}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Closed Trades</h2>
        <p className="mt-2 text-2xl font-semibold">{closedTradesCount}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Realized P&amp;L</h2>
        <p className="mt-2 text-2xl font-semibold">{totalRealizedPnl}</p>
      </div>
    </div>
  )
}