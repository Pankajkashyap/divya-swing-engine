import type { ReactNode } from 'react'
import { TopBar } from '@/components/TopBar'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { DesktopNav } from '@/components/DesktopNav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900 dark:bg-[#111418] dark:text-[#e6eaf0]">
      <TopBar />

      <div className="mx-auto flex min-h-dvh max-w-screen-2xl">
        <DesktopNav />

        <main className="flex-1 pt-[calc(56px+env(safe-area-inset-top))] pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0">
          <div className="min-h-[calc(100dvh-56px-env(safe-area-inset-top)-76px-env(safe-area-inset-bottom))] md:min-h-[calc(100dvh-56px-env(safe-area-inset-top))]">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}