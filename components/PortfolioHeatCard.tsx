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
      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Portfolio Value</h2>
        <p className="mt-2 text-2xl font-semibold">{portfolioValue}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500">
          Open Position Value
          <Tooltip text="The total market value of all your current open trades based on entry prices." />
        </h2>
        <p className="mt-2 text-2xl font-semibold">{openPositionValue}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500">
          Current Exposure %
          <Tooltip text="What percentage of your total portfolio is currently deployed in open trades." />
        </h2>
        <p className="mt-2 text-2xl font-semibold">{exposurePct}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="flex items-center gap-1 text-sm font-medium text-neutral-500">
          Exposure Status
          <Tooltip text="Whether your current exposure is within the limit set by the current market phase." />
        </h2>
        <p className="mt-2 text-2xl font-semibold">
          {isOverLimit ? 'Over Limit' : 'Within Limit'}
        </p>
        <p className="mt-2 flex items-center gap-1 text-sm text-neutral-600">
          Market max
          <Tooltip text="The maximum percentage of your portfolio you should have in open trades given the current market condition. Set by your market snapshot." />
          : {marketMaxExposurePct}%
        </p>
      </div>
    </div>
  )
}