'use client'

import { useEffect, useRef, useState } from 'react'

type TooltipProps = {
  text: string
  position?: 'top' | 'bottom'
}

export function Tooltip({ text, position = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLSpanElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!containerRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const buttonRect = containerRef.current?.getBoundingClientRect()
    const tooltipEl = tooltipRef.current
    const tooltipRect = tooltipEl?.getBoundingClientRect()

    if (!buttonRect || !tooltipEl || !tooltipRect) return

    const shouldFlip =
      position === 'top' && buttonRect.top < tooltipRect.height + 12

    tooltipEl.style.top = shouldFlip ? '100%' : 'auto'
    tooltipEl.style.bottom = shouldFlip ? 'auto' : '100%'
    tooltipEl.style.marginTop = shouldFlip ? '8px' : '0'
    tooltipEl.style.marginBottom = shouldFlip ? '0' : '8px'
  }, [open, position])

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Show explanation"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300 text-[10px] leading-none text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-200"
      >
        ?
      </button>

      {open ? (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="absolute left-1/2 z-50 w-max max-w-65 -translate-x-1/2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[13px] font-normal leading-5 text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          style={{
            top: position === 'bottom' ? '100%' : 'auto',
            bottom: position === 'top' ? '100%' : 'auto',
            marginTop: position === 'bottom' ? '8px' : '0',
            marginBottom: position === 'top' ? '8px' : '0',
          }}
        >
          {text}
        </div>
      ) : null}
    </span>
  )
}