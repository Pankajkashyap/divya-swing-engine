import type { EvalResult } from '@/app/page'
import { Tooltip } from '@/components/ui/Tooltip'

type Props = {
  result: EvalResult | null
}

export function EvaluationPanel({ result }: Props) {
  if (!result) return null

  return (
    <div className="ui-section mt-8">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
        Evaluation Result
      </h2>
      <p className="mt-3 text-sm text-neutral-500 dark:text-[#a8b2bf]">
        Saved evaluation ID: {result.id ?? '—'}
      </p>
      <p className="mt-2 text-neutral-900 dark:text-[#e6eaf0]">
        <span className="font-medium">Verdict:</span> {result.verdict}
      </p>
      <p className="mt-2 text-neutral-900 dark:text-[#e6eaf0]">
        <span className="font-medium">Score:</span> {result.score_total}
        <span className="font-medium">/9</span>
      </p>
      <p className="mt-2 text-neutral-900 dark:text-[#e6eaf0]">
        <span className="font-medium">Decision reason:</span>{' '}
        {result.fail_reason ?? result.notes ?? '—'}
      </p>
      <p className="mt-2 text-neutral-900 dark:text-[#e6eaf0]">
        <span className="font-medium">Notes:</span> {result.notes ?? '—'}
      </p>

      <div className="mt-6">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Rule Breakdown
        </h3>

        <div className="mt-4 ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Result</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1">
                    Market Phase
                    <Tooltip text="The current broad market condition based on Minervini's timing model. Confirmed uptrend means conditions are good for buying. Correction and Bear mean you should be mostly or fully in cash." />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {result.market_phase_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Current market must allow new long entries
                </td>
              </tr>

              <tr>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1">
                    Trend Template
                    <Tooltip text="The stock passes all 8 of Minervini's Trend Template rules: price above 50/150/200-day MAs, MAs in the right order, RS line at new highs, stock within 25% of its 52-week high, and above its 52-week low." />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {result.trend_template_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Stock must satisfy the trend template gate
                </td>
              </tr>

              <tr>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1">
                    Liquidity
                    <Tooltip text="The stock trades enough average daily volume (typically 250K+ shares) that you can enter and exit without moving the price." />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {result.liquidity_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Liquidity gate for trade execution quality
                </td>
              </tr>

              <tr>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1">
                    Base Pattern
                    <Tooltip text="The stock's chart pattern qualifies as a recognisable, well-formed base: a VCP, flat base, cup with handle, or similar. Loose, wide patterns fail this." />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {result.base_pattern_valid ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">Pattern structure must be valid</td>
              </tr>

              <tr>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1">
                    Volume Pattern
                    <Tooltip text="Volume contracted (got quieter) as the stock formed its base. This shows sellers exhausted themselves, which is a healthy sign before a breakout." />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {result.volume_pattern_valid ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Dry-up / constructive volume behavior required
                </td>
              </tr>

              <tr>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1">
                    RS Confirmation
                    <Tooltip text="The Relative Strength line (comparing this stock to the S&P 500) is trending upward and ideally at or near new highs." />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {result.rs_line_confirmed ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Relative strength should confirm leadership
                </td>
              </tr>

              <tr>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1">
                    Entry Near Pivot
                    <Tooltip text="You are buying within 5% of the exact breakout point, not chasing a stock that has already moved significantly." />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {result.entry_near_pivot_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Entry should be near the intended pivot / entry zone
                </td>
              </tr>

              <tr>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1">
                    Breakout Volume
                    <Tooltip text="The breakout day saw volume at least 40-50% above average, confirming institutional buying is driving the move." />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {result.volume_breakout_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Breakout should have enough volume confirmation
                </td>
              </tr>

              <tr>
                <td className="py-3 pr-4">Fundamental Quality</td>
                <td className="py-3 pr-4">
                  {result.fundamental_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  EPS growth, revenue growth, A/D rating, and industry rank must meet thresholds
                </td>
              </tr>

              <tr>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1">
                    Setup Grade
                    <Tooltip text="Your overall quality rating for this trade setup. A+ is the highest conviction, C is marginal. Only take A and B setups." />
                  </span>
                </td>
                <td className="py-3 pr-4">{result.setup_grade ?? '—'}</td>
                <td className="py-3 pr-4">
                  Quality grade influences aggressiveness and sizing
                </td>
              </tr>

              <tr>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1">
                    Earnings Risk
                    <Tooltip text="An earnings report is due within the next two weeks. This adds binary risk — even a great setup can collapse on a bad earnings reaction." />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {result.earnings_risk_flag ? 'Flagged' : 'Clear'}
                </td>
                <td className="py-3 pr-4">
                  Earnings inside 2 weeks should reduce aggressiveness
                </td>
              </tr>

              <tr>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1">
                    Binary Event Risk
                    <Tooltip text="There is an upcoming event (like an FDA decision or major legal ruling) that could cause a large move in either direction regardless of the setup quality." />
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {result.binary_event_flag ? 'Flagged' : 'Clear'}
                </td>
                <td className="py-3 pr-4">
                  Binary event risk should reduce size or delay entry
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}