import type { SavedTradePlan } from '@/app/page'

type Props = {
  savedPlans: SavedTradePlan[]
}

export function SavedTradePlansTable({ savedPlans }: Props) {
  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Saved Trade Plans</h2>
        <p className="text-sm text-neutral-500">{savedPlans.length} records</p>
      </div>

      {savedPlans.length === 0 ? (
        <p className="text-neutral-600">No saved trade plans yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-3 pr-4">Plan Date</th>
                <th className="py-3 pr-4">Side</th>
                <th className="py-3 pr-4">Entry</th>
                <th className="py-3 pr-4">Stop</th>
                <th className="py-3 pr-4">Shares</th>
                <th className="py-3 pr-4">Position Value</th>
                <th className="py-3 pr-4">Expected R/R</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Blocked Reason</th>
              </tr>
            </thead>
            <tbody>
              {savedPlans.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="py-3 pr-4">{row.plan_date}</td>
                  <td className="py-3 pr-4">{row.side}</td>
                  <td className="py-3 pr-4">{row.entry_price ?? '—'}</td>
                  <td className="py-3 pr-4">{row.stop_price ?? '—'}</td>
                  <td className="py-3 pr-4">{row.final_shares ?? '—'}</td>
                  <td className="py-3 pr-4">{row.final_position_value ?? '—'}</td>
                  <td className="py-3 pr-4">{row.expected_rr !== null && row.expected_rr !== undefined? Number(row.expected_rr).toFixed(2): '—'}</td>
                  <td className="py-3 pr-4">{row.approval_status}</td>
                  <td className="py-3 pr-4">{row.blocked_reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}