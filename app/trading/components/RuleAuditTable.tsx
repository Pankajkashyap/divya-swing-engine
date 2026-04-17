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
    <div className="ui-section mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Rule Audit Trail
        </h2>
        <p className="text-sm text-neutral-500 dark:text-[#a8b2bf]">
          {rows.length} records
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-neutral-600 dark:text-[#a8b2bf]">
          No rule audit rows yet.
        </p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Evaluation ID</th>
                <th>Rule Code</th>
                <th>Rule Name</th>
                <th>Passed</th>
                <th>Actual Text</th>
                <th>Actual Numeric</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
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