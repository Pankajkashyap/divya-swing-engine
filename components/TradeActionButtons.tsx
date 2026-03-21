type Props = {
  canEvaluate: boolean
  canGenerate: boolean
  canCreate: boolean
  saving: boolean
  onEvaluate: () => void | Promise<void>
  onGenerate: () => void | Promise<void>
  onCreateTrade: () => void | Promise<void>
}

export function TradeActionButtons({
  canEvaluate,
  canGenerate,
  canCreate,
  saving,
  onEvaluate,
  onGenerate,
  onCreateTrade,
}: Props) {
  return (
    <div className="mt-8 flex flex-wrap gap-4">
      <button
        onClick={onEvaluate}
        disabled={!canEvaluate}
        className="rounded-xl border border-neutral-900 px-5 py-3 text-sm font-medium"
      >
        {saving ? 'Evaluating...' : 'Evaluate Setup'}
      </button>

      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="rounded-xl border border-neutral-900 px-5 py-3 text-sm font-medium"
      >
        Generate Trade Plan
      </button>

      <button
        onClick={onCreateTrade}
        disabled={!canCreate}
        className="rounded-xl border border-neutral-900 px-5 py-3 text-sm font-medium"
      >
        Create Trade
      </button>
    </div>
  )
}