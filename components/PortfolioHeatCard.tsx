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
        <h2 className="text-sm font-medium text-neutral-500">Open Position Value</h2>
        <p className="mt-2 text-2xl font-semibold">{openPositionValue}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Current Exposure %</h2>
        <p className="mt-2 text-2xl font-semibold">{exposurePct}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-medium text-neutral-500">Exposure Status</h2>
        <p className="mt-2 text-2xl font-semibold">
          {isOverLimit ? 'Over Limit' : 'Within Limit'}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Market max: {marketMaxExposurePct}%
        </p>
      </div>
    </div>
  )
}