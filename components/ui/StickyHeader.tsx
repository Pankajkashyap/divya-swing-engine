'use client'

import { useState } from 'react'

type CollapsibleSectionProps = {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="ui-card overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-neutral-500 dark:text-[#a8b2bf]">
              {subtitle}
            </p>
          ) : null}
        </div>

        <span className="shrink-0 text-neutral-500 dark:text-[#a8b2bf]">
          {open ? '−' : '+'}
        </span>
      </button>

      {open ? (
        <div className="border-t border-neutral-200 px-4 py-4 dark:border-[#2a313b] sm:px-5">
          {children}
        </div>
      ) : null}
    </section>
  )
}