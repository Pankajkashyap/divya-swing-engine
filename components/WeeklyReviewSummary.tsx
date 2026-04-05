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
      <div className="ui-card">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Market Phase
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {marketPhase || '—'}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Open Trades
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {openTradesCount}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Closed Trades
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {closedTradesCount}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Realized P&amp;L
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {totalRealizedPnl}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Wins
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {winsCount}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Losses
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {lossesCount}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Average Win
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {avgWin}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
          Average Loss
        </h2>
        <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {avgLoss}
        </p>
      </div>
    </div>
  )
}