import type { EvalResult } from '@/app/page'

type Props = {
  result: EvalResult | null
}

export function EvaluationPanel({ result }: Props) {
  if (!result) return null

  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
      <h2 className="text-lg font-semibold">Evaluation Result</h2>
      <p className="mt-3 text-sm text-neutral-500">
        Saved evaluation ID: {result.id ?? '—'}
      </p>
      <p className="mt-2">
        <span className="font-medium">Verdict:</span> {result.verdict}
      </p>
      <p className="mt-2">
        <span className="font-medium">Score:</span> {result.score_total}
      </p>
      <p className="mt-2">
        <span className="font-medium">Decision reason:</span>{' '}
        {result.fail_reason ?? result.notes ?? '—'}
      </p>
      <p className="mt-2">
        <span className="font-medium">Notes:</span> {result.notes ?? '—'}
      </p>

      <div className="mt-6">
        <h3 className="text-base font-semibold">Rule Breakdown</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-3 pr-4">Rule</th>
                <th className="py-3 pr-4">Result</th>
                <th className="py-3 pr-4">Detail</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Market Phase</td>
                <td className="py-3 pr-4">
                  {result.market_phase_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Current market must allow new long entries
                </td>
              </tr>

              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Trend Template</td>
                <td className="py-3 pr-4">
                  {result.trend_template_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Stock must satisfy the trend template gate
                </td>
              </tr>

              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Liquidity</td>
                <td className="py-3 pr-4">
                  {result.liquidity_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Liquidity gate for trade execution quality
                </td>
              </tr>

              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Base Pattern</td>
                <td className="py-3 pr-4">
                  {result.base_pattern_valid ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">Pattern structure must be valid</td>
              </tr>

              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Volume Pattern</td>
                <td className="py-3 pr-4">
                  {result.volume_pattern_valid ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Dry-up / constructive volume behavior required
                </td>
              </tr>

              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">RS Confirmation</td>
                <td className="py-3 pr-4">
                  {result.rs_line_confirmed ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Relative strength should confirm leadership
                </td>
              </tr>

              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Entry Near Pivot</td>
                <td className="py-3 pr-4">
                  {result.entry_near_pivot_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Entry should be near the intended pivot / entry zone
                </td>
              </tr>

              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Breakout Volume</td>
                <td className="py-3 pr-4">
                  {result.volume_breakout_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  Breakout should have enough volume confirmation
                </td>
              </tr>

              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Reward / Risk</td>
                <td className="py-3 pr-4">
                  {result.rr_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">Current R/R: {result.rr_ratio ?? '—'}</td>
              </tr>
              
              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Fundamental Quality</td>
                <td className="py-3 pr-4">
                  {result.fundamental_pass ? 'Pass' : 'Fail'}
                </td>
                <td className="py-3 pr-4">
                  EPS growth, revenue growth, A/D rating, and industry rank must meet thresholds
                </td>
              </tr>

              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Setup Grade</td>
                <td className="py-3 pr-4">{result.setup_grade ?? '—'}</td>
                <td className="py-3 pr-4">
                  Quality grade influences aggressiveness and sizing
                </td>
              </tr>

              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Earnings Risk</td>
                <td className="py-3 pr-4">
                  {result.earnings_risk_flag ? 'Flagged' : 'Clear'}
                </td>
                <td className="py-3 pr-4">
                  Earnings inside 2 weeks should reduce aggressiveness
                </td>
              </tr>

              <tr className="border-b border-neutral-100">
                <td className="py-3 pr-4">Binary Event Risk</td>
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