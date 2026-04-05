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
      <div className="ui-card">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Market
        </h2>
        <p className="mt-3 text-sm text-neutral-600 dark:text-[#a8b2bf]">
          Current phase
        </p>
        <p className="text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          {market?.market_phase ?? '—'}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Candidate
        </h2>
        <p className="mt-3 text-sm text-neutral-600 dark:text-[#a8b2bf]">
          {stock?.ticker} — {stock?.company_name ?? '—'}
        </p>
        <p className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
          Grade: {stock?.setup_grade ?? '—'}
        </p>
      </div>

      <div className="ui-card">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Portfolio Value
        </h2>
        <p className="mt-3 text-sm text-neutral-600 dark:text-[#a8b2bf]">
          Used for trade sizing
        </p>
        <input
          value={portfolioValue}
          onChange={(e) => setPortfolioValue(e.target.value)}
          className="ui-input mt-2"
          placeholder="100000"
        />
      </div>
    </div>
  )
}