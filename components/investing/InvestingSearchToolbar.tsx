'use client'

type SavedViewOption = {
  key: string
  label: string
}

type DbSavedViewOption = {
  id: string
  name: string
}

type FilterOption = {
  key: string
  label: string
}

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  savedViews?: SavedViewOption[]
  activeSavedViewKey?: string
  onSavedViewChange?: (key: string) => void
  filters?: FilterOption[]
  activeFilterKey?: string
  onFilterChange?: (key: string) => void
  onClearFilters?: () => void
  rightSlot?: React.ReactNode

  dbSavedViews?: DbSavedViewOption[]
  activeDbSavedViewId?: string | null
  onDbSavedViewChange?: (id: string) => void
  onSaveCurrentView?: () => void
  onDeleteDbSavedView?: (id: string) => void
}

export function InvestingSearchToolbar({
  value,
  onChange,
  placeholder,
  savedViews = [],
  activeSavedViewKey,
  onSavedViewChange,
  filters = [],
  activeFilterKey,
  onFilterChange,
  onClearFilters,
  rightSlot,
  dbSavedViews = [],
  activeDbSavedViewId = null,
  onDbSavedViewChange,
  onSaveCurrentView,
  onDeleteDbSavedView,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="ui-input"
          />
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {onSaveCurrentView ? (
            <button type="button" onClick={onSaveCurrentView} className="ui-btn-secondary">
              Save current view
            </button>
          ) : null}

          {onClearFilters ? (
            <button type="button" onClick={onClearFilters} className="ui-btn-secondary">
              Clear filters
            </button>
          ) : null}

          {rightSlot ? rightSlot : null}
        </div>
      </div>

      {savedViews.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {savedViews.map((view) => {
            const isActive = activeSavedViewKey === view.key
            return (
              <button
                key={view.key}
                type="button"
                onClick={() => onSavedViewChange?.(view.key)}
                className={isActive ? 'ui-btn-primary' : 'ui-btn-secondary'}
              >
                {view.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {filters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = activeFilterKey === filter.key
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => onFilterChange?.(filter.key)}
                className={isActive ? 'ui-btn-primary' : 'ui-btn-secondary'}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {dbSavedViews.length > 0 ? (
        <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
          <div className="mb-2 text-sm font-medium text-neutral-900 dark:text-[#e6eaf0]">
            My saved views
          </div>

          <div className="flex flex-wrap gap-2">
            {dbSavedViews.map((view) => {
              const isActive = activeDbSavedViewId === view.id

              return (
                <div key={view.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDbSavedViewChange?.(view.id)}
                    className={isActive ? 'ui-btn-primary' : 'ui-btn-secondary'}
                  >
                    {view.name}
                  </button>

                  {onDeleteDbSavedView ? (
                    <button
                      type="button"
                      onClick={() => onDeleteDbSavedView(view.id)}
                      className="ui-btn-secondary"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}