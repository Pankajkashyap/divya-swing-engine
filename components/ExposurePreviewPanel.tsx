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

  const statusPillClass = !hasValidPlan
    ? 'ui-pill-neutral'
    : willBlock
      ? 'ui-pill-danger'
      : 'ui-pill-success'

  const statusLabel = !hasValidPlan
    ? 'Waiting for valid trade plan'
    : willBlock
      ? 'Will be blocked'
      : 'Within limit'

  const messageClass = !hasValidPlan
    ? 'mt-4 text-sm text-neutral-600 dark:text-[#a8b2bf]'
    : willBlock
      ? 'mt-4 text-sm font-medium text-red-700 dark:text-[#f0a3a3]'
      : 'mt-4 text-sm font-medium text-green-700 dark:text-[#8fd0ab]'

  return (
    <div className="ui-section mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#e6eaf0]">
          Exposure Preview
        </h2>
        <p className={statusPillClass}>{statusLabel}</p>
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

      <p className={messageClass}>
        {!hasValidPlan
          ? 'Generate a valid trade plan to preview exposure impact.'
          : willBlock
            ? `This trade will be blocked because post-trade exposure (${postTradeExposurePct}%) exceeds the limit (${exposureLimitPct}%).`
            : `This trade is within the current exposure limit. Post-trade exposure will be ${postTradeExposurePct}%.`}
      </p>
    </div>
  )
}