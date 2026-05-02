'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { DecisionJournalEntry, QuarterlyReview } from '@/app/investing/types'
import { DataCard } from '@/components/ui/DataCard'
import { DataCardRow } from '@/components/ui/DataCardRow'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { InlineStatusBanner } from '@/components/ui/InlineStatusBanner'
import { InvestingPageHeader } from '@/components/investing/InvestingPageHeader'
import { InvestingSearchToolbar } from '@/components/investing/InvestingSearchToolbar'
import { QuarterlyReviewForm } from '@/components/investing/QuarterlyReviewForm'
import { QuarterlyReviewsTable } from '@/components/investing/QuarterlyReviewsTable'
import { QuarterlyReviewsCardList } from '@/components/investing/QuarterlyReviewsCardList'

type QuarterlyReviewFormPayload = {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  review_date: string
  portfolio_value: number | null
  quarter_return: number | null
  ytd_return: number | null
  sp500_quarter: number | null
  sp500_ytd: number | null
  num_holdings: number | null
  cash_pct: number | null
  cycle_phase: QuarterlyReview['cycle_phase']
  top_lesson: string | null
  action_items: string | null
  emotional_discipline: number | null
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function SkeletonCard() {
  return (
    <div className="ui-card p-4">
      <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
      <div className="mt-4 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-[#2a313b]" />
      </div>
    </div>
  )
}

export default function InvestingReviewsPage() {
const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [reviews, setReviews] = useState<QuarterlyReview[]>([])
  const [journalEntries, setJournalEntries] = useState<DecisionJournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingReview, setEditingReview] = useState<QuarterlyReview | null>(null)
  const [formBusy, setFormBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const [reviewsRes, journalRes] = await Promise.all([
        supabase
          .from('investing_quarterly_reviews')
          .select('*')
          .order('review_date', { ascending: false }),
        supabase
          .from('investing_decision_journal')
          .select('*')
          .order('entry_date', { ascending: false }),
      ])

      if (cancelled) return

      const errors: string[] = []

      if (reviewsRes.error) {
        errors.push(reviewsRes.error.message)
      } else {
        setReviews((reviewsRes.data ?? []) as QuarterlyReview[])
      }

      if (journalRes.error) {
        errors.push(journalRes.error.message)
      } else {
        setJournalEntries((journalRes.data ?? []) as DecisionJournalEntry[])
      }

      if (errors.length > 0) {
        setError(errors.join(' · '))
      }

      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const filteredReviews = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return reviews

    return reviews.filter((review) => {
      return (
        review.quarter.toLowerCase().includes(term) ||
        (review.cycle_phase ?? '').toLowerCase().includes(term) ||
        (review.top_lesson ?? '').toLowerCase().includes(term) ||
        (review.action_items ?? '').toLowerCase().includes(term)
      )
    })
  }, [reviews, search])

  const summary = useMemo(() => {
    const latest = reviews[0] ?? null

    const reviewsWithReturn = reviews.filter((r) => r.quarter_return != null)
    const avgQuarterReturn =
      reviewsWithReturn.length > 0
        ? reviewsWithReturn.reduce((sum, r) => sum + Number(r.quarter_return), 0) /
          reviewsWithReturn.length
        : 0

    const reviewsWithAlpha = reviews.filter((r) => r.alpha != null)
    const avgAlpha =
      reviewsWithAlpha.length > 0
        ? reviewsWithAlpha.reduce((sum, r) => sum + Number(r.alpha), 0) /
          reviewsWithAlpha.length
        : 0

    return {
      total: reviews.length,
      latest,
      avgQuarterReturn,
      avgAlpha,
    }
  }, [reviews])

  const performanceAttribution = useMemo(() => {
    const reviewed = journalEntries.filter(
      (entry) =>
        entry.framework_supported &&
        (entry.three_month_review || entry.twelve_month_review)
    )

    const frameworkYes = reviewed.filter((e) => e.framework_supported === 'Yes')
    const frameworkPartial = reviewed.filter((e) => e.framework_supported === 'Partially')
    const frameworkOverride = reviewed.filter((e) => e.framework_supported === 'No — override')

    const emotionalDecisions = journalEntries.filter((e) =>
      ['Excited', 'Fearful', 'Pressured', 'Impatient'].includes(e.emotional_state ?? '')
    )
    const calmDecisions = journalEntries.filter((e) =>
      ['Calm & analytical', 'Confident'].includes(e.emotional_state ?? '')
    )

    return {
      totalReviewed: reviewed.length,
      frameworkYesCount: frameworkYes.length,
      frameworkPartialCount: frameworkPartial.length,
      frameworkOverrideCount: frameworkOverride.length,
      emotionalDecisionCount: emotionalDecisions.length,
      calmDecisionCount: calmDecisions.length,
      totalDecisions: journalEntries.length,
      overrideRate:
        journalEntries.length > 0
          ? (frameworkOverride.length / journalEntries.length) * 100
          : 0,
      emotionalRate:
        journalEntries.length > 0
          ? (emotionalDecisions.length / journalEntries.length) * 100
          : 0,
    }
  }, [journalEntries])

  function openAddSheet() {
    setSuccess(null)
    setEditingReview(null)
    setSheetOpen(true)
  }

  function openEditSheet(review: QuarterlyReview) {
    setSuccess(null)
    setEditingReview(review)
    setSheetOpen(true)
  }

  function closeSheet() {
    if (formBusy) return
    setSheetOpen(false)
    setEditingReview(null)
  }

  async function handleSaveReview(payload: QuarterlyReviewFormPayload) {
    setFormBusy(true)
    setError(null)
    setSuccess(null)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      setError(authError.message)
      setFormBusy(false)
      return
    }

    const alpha =
      payload.quarter_return != null && payload.sp500_quarter != null
        ? payload.quarter_return - payload.sp500_quarter
        : null

    const record = {
      user_id: user?.id ?? null,
      quarter: payload.quarter,
      review_date: payload.review_date,
      portfolio_value: payload.portfolio_value,
      quarter_return: payload.quarter_return,
      ytd_return: payload.ytd_return,
      sp500_quarter: payload.sp500_quarter,
      sp500_ytd: payload.sp500_ytd,
      num_holdings: payload.num_holdings,
      cash_pct: payload.cash_pct,
      cycle_phase: payload.cycle_phase,
      top_lesson: payload.top_lesson,
      action_items: payload.action_items,
      emotional_discipline: payload.emotional_discipline,
      alpha,
    }

    if (editingReview) {
      const { error: updateError } = await supabase
        .from('investing_quarterly_reviews')
        .update(record)
        .eq('id', editingReview.id)

      if (updateError) {
        setError(updateError.message)
        setFormBusy(false)
        return
      }

      setReviews((prev) =>
        prev
          .map((review) =>
            review.id === editingReview.id
              ? {
                  ...review,
                  ...record,
                }
              : review
          )
          .sort((a, b) => b.review_date.localeCompare(a.review_date))
      )

      setSuccess(`Updated ${payload.quarter} review.`)
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('investing_quarterly_reviews')
        .insert(record)
        .select('*')
        .single()

      if (insertError) {
        setError(insertError.message)
        setFormBusy(false)
        return
      }

      setReviews((prev) =>
        [inserted as QuarterlyReview, ...prev].sort((a, b) =>
          b.review_date.localeCompare(a.review_date)
        )
      )

      setSuccess(`Added ${payload.quarter} review.`)
    }

    setFormBusy(false)
    setSheetOpen(false)
    setEditingReview(null)
  }

  async function handleDeleteReview(review: QuarterlyReview) {
    const confirmed = window.confirm(`Delete ${review.quarter} review?`)
    if (!confirmed) return

    setDeletingId(review.id)
    setError(null)
    setSuccess(null)

    const { error: deleteError } = await supabase
      .from('investing_quarterly_reviews')
      .delete()
      .eq('id', review.id)

    if (deleteError) {
      setError(deleteError.message)
      setDeletingId(null)
      return
    }

    setReviews((prev) => prev.filter((item) => item.id !== review.id))
    setDeletingId(null)
    setSuccess(`Deleted ${review.quarter} review.`)
  }

  return (
    <div className="space-y-4">
      <InvestingPageHeader
        title="Reviews"
        subtitle="Track quarterly performance, alpha, market cycle context, lessons learned, and action items."
        actions={
          <button type="button" onClick={openAddSheet} className="ui-btn-primary">
            Add review
          </button>
        }
      />

      <InlineStatusBanner tone="error" message={error} />
      <InlineStatusBanner tone="success" message={success} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <DataCard title="Review Summary">
              <DataCardRow label="Total reviews" value={String(summary.total)} />
              <DataCardRow label="Latest quarter" value={summary.latest?.quarter ?? '—'} />
              <DataCardRow
                label="Latest review date"
                value={formatDate(summary.latest?.review_date)}
              />
            </DataCard>

            <DataCard title="Performance">
              <DataCardRow
                label="Avg quarter return"
                value={formatPercent(summary.avgQuarterReturn)}
              />
              <DataCardRow label="Avg alpha" value={formatPercent(summary.avgAlpha)} />
              <DataCardRow
                label="Latest portfolio value"
                value={formatCurrency(summary.latest?.portfolio_value)}
              />
            </DataCard>

            <DataCard title="Latest Market Context">
              <DataCardRow label="Cycle phase" value={summary.latest?.cycle_phase ?? '—'} />
              <DataCardRow
                label="S&P quarter"
                value={formatPercent(summary.latest?.sp500_quarter)}
              />
              <DataCardRow label="Alpha" value={formatPercent(summary.latest?.alpha)} />
            </DataCard>

            <DataCard title="Discipline Snapshot">
              <DataCardRow
                label="Emotional discipline"
                value={
                  summary.latest?.emotional_discipline == null
                    ? '—'
                    : String(summary.latest.emotional_discipline)
                }
              />
              <DataCardRow
                label="Holdings"
                value={String(summary.latest?.num_holdings ?? '—')}
              />
              <DataCardRow label="Cash %" value={formatPercent(summary.latest?.cash_pct)} />
            </DataCard>
          </>
        )}
      </section>

      {!loading && reviews.length > 0 ? (
        <InvestingSearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search quarter, cycle phase, lesson, or action items"
        />
      ) : null}

      <CollapsibleSection
        title="Recent reviews"
        subtitle="Mobile-first card view of completed quarterly reviews."
        defaultOpen={true}
      >
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <QuarterlyReviewsCardList
            reviews={filteredReviews}
            onEdit={openEditSheet}
            onDelete={handleDeleteReview}
            deletingId={deletingId}
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Reviews table"
        subtitle="Search and scan the full review history in a denser format."
        defaultOpen={false}
      >
        {loading ? (
          <SkeletonCard />
        ) : (
          <QuarterlyReviewsTable
            reviews={filteredReviews}
            onEdit={openEditSheet}
            onDelete={handleDeleteReview}
            deletingId={deletingId}
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Performance Attribution" defaultOpen={false}>
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
        ) : performanceAttribution.totalDecisions === 0 ? (
          <div className="ui-card p-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
            No journal entries yet. Start logging decisions to see attribution data.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="ui-card p-4">
              <div className="mb-3 text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Decision Discipline
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">
                    Total decisions logged
                  </span>
                  <span>{performanceAttribution.totalDecisions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">
                    Framework-supported (Yes)
                  </span>
                  <span className="text-green-500">
                    {performanceAttribution.frameworkYesCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">
                    Partially supported
                  </span>
                  <span className="text-yellow-500">
                    {performanceAttribution.frameworkPartialCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">
                    Overrides (No)
                  </span>
                  <span className="text-red-500">
                    {performanceAttribution.frameworkOverrideCount}
                  </span>
                </div>
                <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 dark:border-neutral-700">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">Override rate</span>
                  <span
                    className={
                      performanceAttribution.overrideRate > 20
                        ? 'text-red-500'
                        : 'text-green-500'
                    }
                  >
                    {performanceAttribution.overrideRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="ui-card p-4">
              <div className="mb-3 text-sm font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Emotional Discipline
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">
                    Calm / Analytical decisions
                  </span>
                  <span className="text-green-500">
                    {performanceAttribution.calmDecisionCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">
                    Emotional decisions
                  </span>
                  <span className="text-red-500">
                    {performanceAttribution.emotionalDecisionCount}
                  </span>
                </div>
                <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 dark:border-neutral-700">
                  <span className="text-neutral-600 dark:text-[#a8b2bf]">
                    Emotional decision rate
                  </span>
                  <span
                    className={
                      performanceAttribution.emotionalRate > 30
                        ? 'text-red-500'
                        : 'text-green-500'
                    }
                  >
                    {performanceAttribution.emotionalRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {performanceAttribution.overrideRate > 20 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  Your override rate is {performanceAttribution.overrideRate.toFixed(0)}%. The
                  framework exists to protect you — aim for under 20%. Review your overrides to
                  see if they outperformed framework-supported decisions.
                </div>
              </div>
            ) : null}

            {performanceAttribution.emotionalRate > 30 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  {performanceAttribution.emotionalRate.toFixed(0)}% of your decisions were made
                  under emotional pressure. Consider implementing a mandatory 24-hour waiting
                  period for non-urgent decisions.
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CollapsibleSection>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editingReview ? `Edit ${editingReview.quarter} review` : 'Add review'}
      >
        <QuarterlyReviewForm
          key={editingReview?.id ?? 'new-review'}
          initialReview={editingReview}
          onSubmit={handleSaveReview}
          onCancel={closeSheet}
          submitLabel={editingReview ? 'Save changes' : 'Add review'}
          busy={formBusy}
        />
      </BottomSheet>
    </div>
  )
}