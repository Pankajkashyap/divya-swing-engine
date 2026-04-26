'use client'

type SavedViewOption = {
  key: string
  label: string
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
    </div>
  )
}