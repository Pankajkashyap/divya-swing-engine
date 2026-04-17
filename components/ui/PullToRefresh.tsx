'use client'

import { useEffect, useRef, useState } from 'react'

type PullToRefreshProps = {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
  disabled?: boolean
}

const THRESHOLD = 72

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number | null>(null)
  const pullingRef = useRef(false)

  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || disabled) return

    const onTouchStart = (event: TouchEvent) => {
      if (refreshing) return
      if (el.scrollTop > 0) return

      startYRef.current = event.touches[0]?.clientY ?? null
      pullingRef.current = true
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || startYRef.current === null || refreshing) return

      const currentY = event.touches[0]?.clientY ?? startYRef.current
      const delta = currentY - startYRef.current

      if (delta <= 0) {
        setPullDistance(0)
        return
      }

      if (el.scrollTop > 0) {
        pullingRef.current = false
        setPullDistance(0)
        return
      }

      const damped = Math.min(delta * 0.45, 96)
      setPullDistance(damped)
    }

    const onTouchEnd = async () => {
      if (!pullingRef.current) return

      pullingRef.current = false
      startYRef.current = null

      if (pullDistance >= THRESHOLD) {
        setRefreshing(true)
        setPullDistance(48)

        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
          setPullDistance(0)
        }
      } else {
        setPullDistance(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [disabled, onRefresh, pullDistance, refreshing])

  const ready = pullDistance >= THRESHOLD

  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto overscroll-y-contain">
      <div
        className="pointer-events-none sticky top-14 z-20 flex justify-center transition-[height] duration-200"
        style={{ height: pullDistance }}
        aria-hidden="true"
      >
        <div className="flex items-center justify-center">
          <div className="ui-pill-neutral min-w-30 justify-center">
            {refreshing
              ? 'Refreshing...'
              : ready
                ? 'Release to refresh'
                : 'Pull to refresh'}
          </div>
        </div>
      </div>

      <div
        className="transition-transform duration-200"
        style={{ transform: `translateY(${refreshing ? 0 : 0}px)` }}
      >
        {children}
      </div>
    </div>
  )
}