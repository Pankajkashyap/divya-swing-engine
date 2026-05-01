'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ResearchRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = searchParams.toString()
    router.replace(`/investing/analysis${params ? `?${params}` : ''}`)
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-sm text-neutral-500 dark:text-[#a8b2bf]">
        Loading Research...
      </div>
    </div>
  )
}

export default function ResearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Loading...</div>}>
      <ResearchRedirect />
    </Suspense>
  )
}