'use client'

import Link from 'next/link'

type Props = {
  addHoldingHref: string
  addWatchlistHref: string
  createAnalysisHref: string
  createJournalHref: string
  hasHolding: boolean
  hasWatchlistItem: boolean
  hasAnalysis: boolean
  ticker: string
}

export function TickerActionBar({
  addHoldingHref,
  addWatchlistHref,
  createAnalysisHref,
  createJournalHref,
  hasHolding,
  hasWatchlistItem,
  hasAnalysis,
  ticker,
}: Props) {
  return (
    <div className="ui-card p-4">
      <div className="flex flex-wrap gap-2">
        <Link href={addHoldingHref} className="ui-btn-secondary">
          {hasHolding ? 'Manage holding' : 'Add holding'}
        </Link>
        <Link href={addWatchlistHref} className="ui-btn-secondary">
          {hasWatchlistItem ? 'Update watchlist item' : 'Add to watchlist'}
        </Link>
        <Link href={createAnalysisHref} className="ui-btn-secondary">
          {hasAnalysis ? 'Update analysis' : 'Create analysis'}
        </Link>
        <Link href={createJournalHref} className="ui-btn-secondary">
          Create journal entry
        </Link>
      </div>

      <div className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
        These actions open the related page with{' '}
        <span className="font-medium text-neutral-900 dark:text-[#e6eaf0]">{ticker}</span>{' '}
        prefilled.
      </div>
    </div>
  )
}