type RuleAuditRow = {
  id: string
  setup_evaluation_id: string
  rule_code: string
  rule_name: string
  passed: boolean | null
  actual_value_text: string | null
  actual_value_numeric: number | null
  notes: string | null
}

type Props = {
  rows: RuleAuditRow[]
}

export function RuleAuditTable({ rows }: Props) {
  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Rule Audit Trail</h2>
        <p className="text-sm text-neutral-500">{rows.length} records</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-neutral-600">No rule audit rows yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-3 pr-4">Evaluation ID</th>
                <th className="py-3 pr-4">Rule Code</th>
                <th className="py-3 pr-4">Rule Name</th>
                <th className="py-3 pr-4">Passed</th>
                <th className="py-3 pr-4">Actual Text</th>
                <th className="py-3 pr-4">Actual Numeric</th>
                <th className="py-3 pr-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="py-3 pr-4">{row.setup_evaluation_id}</td>
                  <td className="py-3 pr-4">{row.rule_code}</td>
                  <td className="py-3 pr-4">{row.rule_name}</td>
                  <td className="py-3 pr-4">
                    {row.passed === null ? '—' : row.passed ? 'Pass' : 'Fail'}
                  </td>
                  <td className="py-3 pr-4">{row.actual_value_text ?? '—'}</td>
                  <td className="py-3 pr-4">{row.actual_value_numeric ?? '—'}</td>
                  <td className="py-3 pr-4">{row.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}