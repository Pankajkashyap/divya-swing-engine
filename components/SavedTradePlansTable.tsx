import type { SavedTradePlan } from '@/app/page'

type Props = {
  savedPlans: SavedTradePlan[]
}

export function SavedTradePlansTable({ savedPlans }: Props) {
  return (
    <div className="ui-section mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Saved Trade Plans
        </h2>
        <p className="text-sm text-neutral-500 dark:text-[#a8b2bf]">
          {savedPlans.length} records
        </p>
      </div>

      {savedPlans.length === 0 ? (
        <p className="text-neutral-600 dark:text-[#a8b2bf]">
          No saved trade plans yet.
        </p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Plan Date</th>
                <th>Side</th>
                <th>Entry</th>
                <th>Stop</th>
                <th>Shares</th>
                <th>Position Value</th>
                <th>Expected R/R</th>
                <th>Status</th>
                <th>Blocked Reason</th>
              </tr>
            </thead>
            <tbody>
              {savedPlans.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4">{row.plan_date}</td>
                  <td className="py-3 pr-4">{row.side}</td>
                  <td className="py-3 pr-4">{row.entry_price ?? '—'}</td>
                  <td className="py-3 pr-4">{row.stop_price ?? '—'}</td>
                  <td className="py-3 pr-4">{row.final_shares ?? '—'}</td>
                  <td className="py-3 pr-4">{row.final_position_value ?? '—'}</td>
                  <td className="py-3 pr-4">
                    {row.expected_rr !== null && row.expected_rr !== undefined
                      ? Number(row.expected_rr).toFixed(2)
                      : '—'}
                  </td>
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