import { Tooltip } from '@/components/ui/Tooltip'

type Props = {
  portfolioValue: number
  openPositionValue: number
  exposurePct: number
  marketMaxExposurePct: number
  heatPct: number
  heatRemainingPct: number
  freeRideCount: number
}

export function PortfolioHeatCard({
  portfolioValue,
  openPositionValue,
  exposurePct,
  marketMaxExposurePct,
  heatPct,
  heatRemainingPct,
  freeRideCount,
}: Props) {
  const isOverLimit = exposurePct > marketMaxExposurePct

  return (
    <>
      <div className="mt-8 grid gap-6 md:grid-cols-4">
        <div className="ui-card">
          <h2 className="text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
            Portfolio Value
          </h2>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {portfolioValue}
          </p>
        </div>

        <div className="ui-card">
          <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
            Open Position Value
            <Tooltip text="The total market value of all your current open trades based on entry prices." />
          </h2>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {openPositionValue}
          </p>
        </div>

        <div className="ui-card">
          <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
            Current Exposure %
            <Tooltip text="What percentage of your total portfolio is currently deployed in open trades." />
          </h2>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {exposurePct}
          </p>
        </div>

        <div className="ui-card">
          <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
            Exposure Status
            <Tooltip text="Whether your current exposure is within the limit set by the current market phase." />
          </h2>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {isOverLimit ? 'Over Limit' : 'Within Limit'}
          </p>
          <p className="mt-2 flex items-center gap-1 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            Market max
            <Tooltip text="The maximum percentage of your portfolio you should have in open trades given the current market condition. Set by your market snapshot." />
            : {marketMaxExposurePct}%
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="ui-card">
          <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
            Portfolio Heat %
            <Tooltip text="The total dollar risk across all open positions (entry minus stop, times shares held) expressed as a percentage of your portfolio. This is different from exposure — a large position with a tight stop has low heat." />
          </h2>
          <p
            className={[
              'mt-2 text-2xl font-semibold',
              heatPct <= marketMaxExposurePct * 0.75
                ? 'text-green-600 dark:text-green-400'
                : heatPct <= marketMaxExposurePct
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400',
            ].join(' ')}
          >
            {heatPct}%
          </p>
        </div>

        <div className="ui-card">
          <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
            Heat Remaining %
            <Tooltip text="How much more heat capacity you have before hitting the ceiling for the current market phase. When this reaches zero, no new positions should be added." />
          </h2>
          <p
            className={[
              'mt-2 text-2xl font-semibold',
              heatRemainingPct > marketMaxExposurePct * 0.25
                ? 'text-green-600 dark:text-green-400'
                : heatRemainingPct > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400',
            ].join(' ')}
          >
            {heatRemainingPct}%
          </p>
        </div>

        <div className="ui-card">
          <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-[#a8b2bf]">
            Free Ride Positions
            <Tooltip text="Positions where your stop is now above your entry price. These contribute zero heat — your downside risk on them is eliminated." />
          </h2>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {freeRideCount}
          </p>
        </div>
      </div>
    </>
  )
}