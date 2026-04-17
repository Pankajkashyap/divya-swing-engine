'use client'

import { useEffect } from 'react'

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close sheet"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-neutral-200 bg-white shadow-2xl dark:border-[#2a313b] dark:bg-[#181d23] md:left-1/2 md:max-w-xl md:-translate-x-1/2 md:rounded-3xl md:bottom-6">
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-[#3a4452]" />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-6">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-base font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                {title}
              </h2>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ui-btn-secondary shrink-0"
          >
            Close
          </button>
        </div>

        <div className="max-h-[80dvh] overflow-y-auto px-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:px-6">
          {children}
        </div>
      </div>
    </div>
  )
}