import type { TradePlanResult } from '@/app/page'

type Props = {
  plan: TradePlanResult | null
}

export function TradePlanPanel({ plan }: Props) {
  if (!plan) return null

  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
      <h2 className="text-lg font-semibold">Trade Plan</h2>
      <p className="mt-3">
        <span className="font-medium">Risk</span> {plan.risk_pct}<span className="font-medium">%</span>
      </p>
      <p className="mt-2">
        <span className="font-medium">Dollar Risk: $</span>{plan.dollar_risk}
      </p>
      <p className="mt-2">
        <span className="font-medium">Entry: $</span>{plan.entry_price}
      </p>
      <p className="mt-2">
        <span className="font-medium">Stop: $</span>{plan.stop_price}
      </p>
      <p className="mt-2">
        <span className="font-medium">Risk / Share:</span> {plan.risk_per_share}
      </p>
      <p className="mt-2">
        <span className="font-medium">Planned Shares:</span> {plan.planned_shares}
      </p>
      <p className="mt-2">
        <span className="font-medium">Final Shares:</span> {plan.final_shares}
      </p>
      <p className="mt-2">
        <span className="font-medium">Final Position Value: $</span>{plan.final_position_value}
      </p>
      <p className="mt-2">
        <span className="font-medium">Expected R/R:</span> {plan.expected_rr}
      </p>
      <p className="mt-2">
        <span className="font-medium">Status:</span> {plan.approval_status}
      </p>
      <p className="mt-2">
        <span className="font-medium">Blocked reason:</span>{' '}
        {plan.blocked_reason ?? '—'}
      </p>
    </div>
  )
}