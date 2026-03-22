import type { MarketSnapshot, WatchlistRow } from '@/app/page'

type Props = {
  market: MarketSnapshot | null
  stock: WatchlistRow | null
  portfolioValue: string
  setPortfolioValue: (value: string) => void
}

export function MarketSummaryCards({
  market,
  stock,
  portfolioValue,
  setPortfolioValue,
}: Props) {
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-3">
      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-lg font-semibold">Market</h2>
        <p className="mt-3 text-sm text-neutral-600">Current phase</p>
        <p className="text-2xl font-semibold">{market?.market_phase ?? '—'}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-lg font-semibold">Candidate</h2>
        <p className="mt-3 text-sm text-neutral-600">
          {stock?.ticker} — {stock?.company_name ?? '—'}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Grade: {stock?.setup_grade ?? '—'}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-lg font-semibold">Portfolio Value</h2>
        <p className="mt-3 text-sm text-neutral-600">Used for trade sizing</p>
        <input
          value={portfolioValue}
          onChange={(e) => setPortfolioValue(e.target.value)}
          className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          placeholder="100000"
        />
      </div>
    </div>
  )
}