import { Tooltip } from '@/components/ui/Tooltip'

type Props = {
  portfolioValue: number
  openPositionValue: number
  exposurePct: number
  marketMaxExposurePct: number
}

export function PortfolioHeatCard({
  portfolioValue,
  openPositionValue,
  exposurePct,
  marketMaxExposurePct,
}: Props) {
  const isOverLimit = exposurePct > marketMaxExposurePct

  return (
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
  )
}