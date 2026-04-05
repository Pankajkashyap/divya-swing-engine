'use client'

import { Tooltip } from '@/components/ui/Tooltip'

type Props = {
  portfolioValue: number
  currentOpenPositionValue: number
  newTradePositionValue: number
  exposureLimitPct: number
  hasValidPlan: boolean
}

export function ExposurePreviewPanel({
  portfolioValue,
  currentOpenPositionValue,
  newTradePositionValue,
  exposureLimitPct,
  hasValidPlan,
}: Props) {
  const currentExposurePct =
    portfolioValue > 0
      ? Number(((currentOpenPositionValue / portfolioValue) * 100).toFixed(2))
      : 0

  const postTradeExposurePct =
    portfolioValue > 0
      ? Number(
          (
            ((currentOpenPositionValue + newTradePositionValue) / portfolioValue) *
            100
          ).toFixed(2)
        )
      : 0

  const willBlock =
    hasValidPlan &&
    portfolioValue > 0 &&
    postTradeExposurePct > exposureLimitPct

  const statusClass = !hasValidPlan
    ? 'bg-neutral-100 text-neutral-600 dark:bg-[#20262e] dark:text-[#a8b2bf] dark:border dark:border-[#2a313b]'
    : willBlock
      ? 'bg-red-100 text-red-700 dark:bg-[#3a2227] dark:text-[#f0a3a3] dark:border dark:border-[#5a2d33]'
      : 'bg-green-100 text-green-700 dark:bg-[#1f3329] dark:text-[#8fd0ab] dark:border dark:border-[#2f5a43]'

  return (
    <div className="ui-section mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Exposure Preview
        </h2>
        <p className={['rounded-full px-3 py-1 text-xs font-medium', statusClass].join(' ')}>
          {!hasValidPlan
            ? 'Waiting for valid trade plan'
            : willBlock
              ? 'Will be blocked'
              : 'Within limit'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="ui-card p-4">
          <p className="flex items-center gap-1 text-sm text-neutral-500 dark:text-[#a8b2bf]">
            Current Exposure
            <Tooltip text="What percentage of your portfolio is already in open trades before this new trade." />
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {currentExposurePct}%
          </p>
        </div>

        <div className="ui-card p-4">
          <p className="flex items-center gap-1 text-sm text-neutral-500 dark:text-[#a8b2bf]">
            New Trade Value
            <Tooltip text="The dollar value of the position you are about to enter, based on the calculated share count." />
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {newTradePositionValue}
          </p>
        </div>

        <div className="ui-card p-4">
          <p className="flex items-center gap-1 text-sm text-neutral-500 dark:text-[#a8b2bf]">
            After Trade
            <Tooltip text="What your total exposure percentage will be if you take this trade." />
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {postTradeExposurePct}%
          </p>
        </div>

        <div className="ui-card p-4">
          <p className="flex items-center gap-1 text-sm text-neutral-500 dark:text-[#a8b2bf]">
            Limit
            <Tooltip text="The maximum exposure allowed by the current market phase. You cannot exceed this." />
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-[#e6eaf0]">
            {exposureLimitPct}%
          </p>
        </div>
      </div>

      {hasValidPlan ? (
        <p
          className={[
            'mt-4 text-sm font-medium',
            willBlock ? 'text-red-700 dark:text-[#f0a3a3]' : 'text-green-700 dark:text-[#8fd0ab]',
          ].join(' ')}
        >
          {willBlock
            ? `This trade will be blocked because post-trade exposure (${postTradeExposurePct}%) exceeds the limit (${exposureLimitPct}%).`
            : `This trade is within the current exposure limit. Post-trade exposure will be ${postTradeExposurePct}%.`}
        </p>
      ) : (
        <p className="mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]">
          Generate a valid trade plan to preview exposure impact.
        </p>
      )}
    </div>
  )
}