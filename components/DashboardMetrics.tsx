import { Tooltip } from '@/components/ui/Tooltip'

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
        <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500">
          Watchlist Names
          <Tooltip text="Stocks you are actively monitoring for a potential buy signal." />
        </h2>
        <p className="mt-2 text-2xl font-semibold">{watchlistCount}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500">
          Open Trades
          <Tooltip text="Trades you have entered and are currently holding." />
        </h2>
        <p className="mt-2 text-2xl font-semibold">{openTradesCount}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500">
          Closed Trades
          <Tooltip text="Trades you have fully exited, either at a profit or a loss." />
        </h2>
        <p className="mt-2 text-2xl font-semibold">{closedTradesCount}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500">
          Realized P&amp;L
          <Tooltip text="The actual profit or loss you have locked in from closed trades, in dollars." />
        </h2>
        <p className="mt-2 text-2xl font-semibold">{totalRealizedPnl}</p>
      </div>
    </div>
  )
}