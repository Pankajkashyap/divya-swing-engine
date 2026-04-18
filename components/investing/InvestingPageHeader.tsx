'use client'

import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle: string
  actions?: ReactNode
}

export function InvestingPageHeader({
  title,
  subtitle,
  actions,
}: Props) {
  return (
    <header className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-[#e6eaf0]">
            {title}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
            {subtitle}
          </p>
        </div>

        {actions ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}