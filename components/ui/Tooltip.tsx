'use client'

import { useEffect, useId, useRef, useState } from 'react'

type TooltipProps = {
  text: string
  position?: 'top' | 'bottom'
}

export function Tooltip({ text, position = 'top' }: TooltipProps) {
  const tooltipId = useId()
  const wrapperRef = useRef<HTMLSpanElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [resolvedPosition, setResolvedPosition] = useState<'top' | 'bottom'>(position)

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      if (position === 'top' && rect.top < 80) {
        setResolvedPosition('bottom')
      } else {
        setResolvedPosition(position)
      }
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, position])

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label="Show explanation"
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300 text-[10px] leading-none text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-700"
      >
        ?
      </button>

      {open ? (
        <div
          id={tooltipId}
          role="tooltip"
          className={[
            'absolute left-1/2 z-50 w-max max-w-65 -translate-x-1/2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[13px] font-normal leading-5 text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200',
            resolvedPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          ].join(' ')}
        >
          {text}
        </div>
      ) : null}
    </span>
  )
}