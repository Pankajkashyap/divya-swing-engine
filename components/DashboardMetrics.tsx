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
      <div className="ui-card">
        <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Watchlist Names
          <Tooltip text="Stocks you are actively monitoring for a potential buy signal." />
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {watchlistCount}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Open Trades
          <Tooltip text="Trades you have entered and are currently holding." />
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {openTradesCount}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Closed Trades
          <Tooltip text="Trades you have fully exited, either at a profit or a loss." />
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {closedTradesCount}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Realized P&amp;L
          <Tooltip text="The actual profit or loss you have locked in from closed trades, in dollars." />
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {totalRealizedPnl}
        </p>
      </div>
    </div>
  )
}