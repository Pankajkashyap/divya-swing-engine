type Props = {
  marketPhase: string
  openTradesCount: number
  closedTradesCount: number
  totalRealizedPnl: number
  winsCount: number
  lossesCount: number
  avgWin: number
  avgLoss: number
}

export function WeeklyReviewSummary({
  marketPhase,
  openTradesCount,
  closedTradesCount,
  totalRealizedPnl,
  winsCount,
  lossesCount,
  avgWin,
  avgLoss,
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-4">
      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Market Phase</h2>
        <p className="mt-2 text-2xl font-semibold">{marketPhase || '—'}</p>
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

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Wins</h2>
        <p className="mt-2 text-2xl font-semibold">{winsCount}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Losses</h2>
        <p className="mt-2 text-2xl font-semibold">{lossesCount}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Average Win</h2>
        <p className="mt-2 text-2xl font-semibold">{avgWin}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Average Loss</h2>
        <p className="mt-2 text-2xl font-semibold">{avgLoss}</p>
      </div>
    </div>
  )
}