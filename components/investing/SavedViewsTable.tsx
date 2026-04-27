'use client'

type SavedViewRecord = {
  id: string
  user_id: string
  page_key: string
  name: string
  query_text: string | null
  saved_view_key: string | null
  filter_key: string | null
  created_at: string
  updated_at: string
}

type Props = {
  views: SavedViewRecord[]
  loading?: boolean
  renamingId?: string | null
  deletingId?: string | null
  onApply: (view: SavedViewRecord) => void
  onRename: (view: SavedViewRecord) => void
  onDelete: (view: SavedViewRecord) => void
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPageLabel(pageKey: string) {
  switch (pageKey) {
    case 'analysis':
      return 'Analysis'
    case 'watchlist':
      return 'Watchlist'
    case 'portfolio':
      return 'Portfolio'
    case 'journal':
      return 'Journal'
    default:
      return pageKey
  }
}

export function SavedViewsTable({
  views,
  loading = false,
  renamingId = null,
  deletingId = null,
  onApply,
  onRename,
  onDelete,
}: Props) {
  if (loading) {
    return (
      <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        Loading saved views...
      </div>
    )
  }

  if (views.length === 0) {
    return (
      <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        No saved views found.
      </div>
    )
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Page</th>
            <th>Search</th>
            <th>Built-in View</th>
            <th>Filter</th>
            <th>Created</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {views.map((view) => (
            <tr key={view.id}>
              <td className="font-medium">{view.name}</td>
              <td>{formatPageLabel(view.page_key)}</td>
              <td>{view.query_text ?? '—'}</td>
              <td>{view.saved_view_key ?? '—'}</td>
              <td>{view.filter_key ?? '—'}</td>
              <td>{formatDateTime(view.created_at)}</td>
              <td>{formatDateTime(view.updated_at)}</td>
              <td>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onApply(view)}
                    className="ui-btn-secondary"
                  >
                    Apply
                  </button>

                  <button
                    type="button"
                    onClick={() => onRename(view)}
                    className="ui-btn-secondary"
                    disabled={renamingId === view.id}
                  >
                    {renamingId === view.id ? 'Renaming...' : 'Rename'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(view)}
                    className="ui-btn-secondary"
                    disabled={deletingId === view.id}
                  >
                    {deletingId === view.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}