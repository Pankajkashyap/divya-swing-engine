import type { ReactNode } from 'react'

type Column<T> = {
  key: string
  header: string
  className?: string
  render: (item: T) => ReactNode
}

type ResponsiveDataTableProps<T> = {
  items: T[]
  columns: Column<T>[]
  mobileCard: (item: T) => ReactNode
  emptyState?: ReactNode
}

export function ResponsiveDataTable<T>({
  items,
  columns,
  mobileCard,
  emptyState,
}: ResponsiveDataTableProps<T>) {
  if (items.length === 0) {
    return (
      <div className="ui-card">
        {emptyState ?? (
          <p className="text-sm text-neutral-500 dark:text-[#a8b2bf]">
            No data available.
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {items.map((item, index) => (
          <div key={index}>{mobileCard(item)}</div>
        ))}
      </div>

      <div className="hidden md:block">
        <div className="ui-card overflow-hidden p-0">
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className={column.className}>
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {items.map((item, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((column) => (
                      <td key={column.key} className={column.className}>
                        {column.render(item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}