import type { ReactNode } from 'react'

type DataCardProps = {
  title: ReactNode
  subtitle?: ReactNode
  rightSlot?: ReactNode
  children: ReactNode
  className?: string
}

export function DataCard({
  title,
  subtitle,
  rightSlot,
  children,
  className = '',
}: DataCardProps) {
  return (
    <div className={`ui-card ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {title}
          </div>

          {subtitle ? (
            <div className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
              {subtitle}
            </div>
          ) : null}
        </div>

        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  )
}