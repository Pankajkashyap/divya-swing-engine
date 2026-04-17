type Props = {
  canEvaluate: boolean
  canGenerate: boolean
  canCreate: boolean
  saving: boolean
  evaluateBlockReason: string | null
  generateBlockReason: string | null
  createBlockReason: string | null
  onEvaluate: () => void | Promise<void>
  onGenerate: () => void | Promise<void>
  onCreateTrade: () => void | Promise<void>
}

export function TradeActionButtons({
  canEvaluate,
  canGenerate,
  canCreate,
  saving,
  evaluateBlockReason,
  generateBlockReason,
  createBlockReason,
  onEvaluate,
  onGenerate,
  onCreateTrade,
}: Props) {
  const helperMessage =
    (!canEvaluate && evaluateBlockReason) ||
    (canEvaluate && !canGenerate && generateBlockReason) ||
    (canGenerate && !canCreate && createBlockReason) ||
    null

  return (
    <div className="ui-section mt-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onEvaluate}
            disabled={!canEvaluate}
            className="ui-btn-primary"
          >
            {saving ? 'Evaluating...' : 'Evaluate Setup'}
          </button>

          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="ui-btn-secondary"
          >
            Generate Trade Plan
          </button>

          <button
            onClick={onCreateTrade}
            disabled={!canCreate}
            className="ui-btn-secondary"
          >
            Create Trade
          </button>
        </div>

        {helperMessage ? (
          <p className="text-sm text-neutral-600 dark:text-[#a8b2bf]">
            {helperMessage}
          </p>
        ) : null}
      </div>
    </div>
  )
}