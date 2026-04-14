import type { MarketSnapshot, WatchlistRow } from '@/app/page'

type Props = {
  market: MarketSnapshot | null
  marketPhaseOverride?: string | null
  stock: WatchlistRow | null
  portfolioValue: string
  setPortfolioValue: (value: string) => void
}

export function MarketSummaryCards({
  market,
  marketPhaseOverride,
  stock,
  portfolioValue,
  setPortfolioValue,
}: Props) {
  const ftdConfidence = market?.ftd_confidence

  const ftdConfidenceDisplay =
    ftdConfidence === 'high'
      ? {
          text: '✅ High',
          className: 'text-sm font-medium text-green-700 dark:text-[#8fd0ab]',
        }
      : ftdConfidence === 'medium'
        ? {
            text: '⚠️ Medium',
            className: 'text-sm font-medium text-amber-700 dark:text-[#e7c27d]',
          }
        : ftdConfidence === 'low'
          ? {
              text: '⚠️ Low',
              note: 'Verify on TradingView before trading',
              className: 'text-sm font-medium text-red-700 dark:text-[#f0a3a3]',
            }
          : {
              text: 'Calculating...',
              className: 'text-sm font-medium text-neutral-500 dark:text-[#8b98a7]',
            }

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
          {marketPhaseOverride ?? market?.market_phase ?? '—'}
        </p>

        {market?.ftd_active === true && (
          <div className="mt-3">
            <p className="text-xs text-neutral-500 dark:text-[#8b98a7]">
              FTD confidence
            </p>
            <p className={ftdConfidenceDisplay.className}>
              {ftdConfidenceDisplay.text}
              {'note' in ftdConfidenceDisplay && ftdConfidenceDisplay.note
                ? ` — ${ftdConfidenceDisplay.note}`
                : ''}
            </p>
          </div>
        )}
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