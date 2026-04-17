import type { ReactNode } from 'react'

type DataCardRowProps = {
  label: ReactNode
  value: ReactNode
  className?: string
}

export function DataCardRow({
  label,
  value,
  className = '',
}: DataCardRowProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0 text-xs text-neutral-500 dark:text-[#a8b2bf]">
        {label}
      </div>

      <div className="text-right text-sm text-neutral-900 dark:text-[#e6eaf0]">
        {value}
      </div>
    </div>
  )
}