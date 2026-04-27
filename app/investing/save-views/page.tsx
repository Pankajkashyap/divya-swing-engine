'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { InvestingPageHeader } from '@/components/investing/InvestingPageHeader'
import { InlineStatusBanner } from '@/components/ui/InlineStatusBanner'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { SavedViewsTable } from '@/components/investing/SavedViewsTable'

type SavedViewRecord = {
  id: string
  user_id: string
  page_key: string
  name: string
  query_text: string | null
  saved_view_key: string | null
  filter_key: string | null
  created_at: string
  updated_at: string
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getPagePath(pageKey: string) {
  switch (pageKey) {
    case 'analysis':
      return '/investing/analysis'
    case 'watchlist':
      return '/investing/watchlist'
    case 'portfolio':
      return '/investing/portfolio'
    case 'journal':
      return '/investing/journal'
    default:
      return '/investing'
  }
}

function buildSavedViewUrl(view: SavedViewRecord) {
  const path = getPagePath(view.page_key)
  const params = new URLSearchParams()

  if (view.query_text?.trim()) {
    params.set('q', view.query_text.trim())
  }

  if (view.saved_view_key?.trim()) {
    params.set('view', view.saved_view_key.trim())
  }

  if (view.filter_key?.trim()) {
    params.set('filter', view.filter_key.trim())
  }

  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export default function InvestingSavedViewsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const router = useRouter()

  const [savedViews, setSavedViews] = useState<SavedViewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!user) {
        setSavedViews([])
        setLoading(false)
        return
      }

      const { data, error: loadError } = await supabase
        .from('investing_saved_views')
        .select('*')
        .eq('user_id', user.id)
        .order('page_key', { ascending: true })
        .order('created_at', { ascending: true })

      if (cancelled) return

      if (loadError) {
        setError(loadError.message)
        setLoading(false)
        return
      }

      setSavedViews((data ?? []) as SavedViewRecord[])
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const summary = useMemo(() => {
    const analysis = savedViews.filter((item) => item.page_key === 'analysis').length
    const watchlist = savedViews.filter((item) => item.page_key === 'watchlist').length
    const portfolio = savedViews.filter((item) => item.page_key === 'portfolio').length
    const journal = savedViews.filter((item) => item.page_key === 'journal').length

    return {
      total: savedViews.length,
      analysis,
      watchlist,
      portfolio,
      journal,
      latestCreatedAt: savedViews[savedViews.length - 1]?.created_at ?? null,
    }
  }, [savedViews])

  function handleApply(view: SavedViewRecord) {
    router.push(buildSavedViewUrl(view))
  }

  async function handleRename(view: SavedViewRecord) {
    const nextName = window.prompt('Rename saved view:', view.name)
    if (!nextName?.trim() || nextName.trim() === view.name) return

    setRenamingId(view.id)
    setError(null)
    setSuccess(null)

    const { data, error: updateError } = await supabase
      .from('investing_saved_views')
      .update({
        name: nextName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', view.id)
      .select('*')
      .single()

    if (updateError) {
      setError(updateError.message)
      setRenamingId(null)
      return
    }

    setSavedViews((prev) =>
      prev.map((item) => (item.id === view.id ? ((data as SavedViewRecord) ?? item) : item))
    )
    setRenamingId(null)
    setSuccess(`Renamed view to "${nextName.trim()}".`)
  }

  async function handleDelete(view: SavedViewRecord) {
    const confirmed = window.confirm(`Delete saved view "${view.name}"?`)
    if (!confirmed) return

    setDeletingId(view.id)
    setError(null)
    setSuccess(null)

    const { error: deleteError } = await supabase
      .from('investing_saved_views')
      .delete()
      .eq('id', view.id)

    if (deleteError) {
      setError(deleteError.message)
      setDeletingId(null)
      return
    }

    setSavedViews((prev) => prev.filter((item) => item.id !== view.id))
    setDeletingId(null)
    setSuccess(`Deleted "${view.name}".`)
  }

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Saved Views"
        subtitle="Manage your custom investing views across analysis, watchlist, portfolio, and journal."
        actions={
          <Link href="/investing" className="ui-btn-secondary">
            Back to dashboard
          </Link>
        }
      />

      <InlineStatusBanner tone="error" message={error} />
      <InlineStatusBanner tone="success" message={success} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DataCard title="Saved Views Summary">
          <DataCardRow label="Total" value={String(summary.total)} />
          <DataCardRow label="Latest created" value={formatDateTime(summary.latestCreatedAt)} />
        </DataCard>

        <DataCard title="Analysis">
          <DataCardRow label="Views" value={String(summary.analysis)} />
        </DataCard>

        <DataCard title="Watchlist">
          <DataCardRow label="Views" value={String(summary.watchlist)} />
        </DataCard>

        <DataCard title="Portfolio">
          <DataCardRow label="Views" value={String(summary.portfolio)} />
        </DataCard>

        <DataCard title="Journal">
          <DataCardRow label="Views" value={String(summary.journal)} />
        </DataCard>
      </section>

      <SavedViewsTable
        views={savedViews}
        loading={loading}
        renamingId={renamingId}
        deletingId={deletingId}
        onApply={handleApply}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    </div>
  )
}