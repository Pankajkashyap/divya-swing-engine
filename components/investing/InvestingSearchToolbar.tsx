'use client'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  rightSlot?: React.ReactNode
}

export function InvestingSearchToolbar({
  value,
  onChange,
  placeholder,
  rightSlot,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="ui-input"
        />
      </div>

      {rightSlot ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {rightSlot}
        </div>
      ) : null}
    </div>
  )
}