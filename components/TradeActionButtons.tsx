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
return (
  <div className="mt-8">
    <div className="flex flex-wrap gap-4">
      <button onClick={onEvaluate} disabled={!canEvaluate} className="ui-btn-primary">
        {saving ? 'Evaluating...' : 'Evaluate Setup'}
      </button>

      <button onClick={onGenerate} disabled={!canGenerate} className="ui-btn-primary">
        Generate Trade Plan
      </button>

      <button onClick={onCreateTrade} disabled={!canCreate} className="ui-btn-primary">
        Create Trade
      </button>
    </div>

    {!canEvaluate && evaluateBlockReason ? (
      <p className="mt-3 text-sm text-neutral-600">{evaluateBlockReason}</p>
    ) : null}

    {canEvaluate && !canGenerate && generateBlockReason ? (
      <p className="mt-2 text-sm text-neutral-600">{generateBlockReason}</p>
    ) : null}

    {canGenerate && !canCreate && createBlockReason ? (
      <p className="mt-2 text-sm text-neutral-600">{createBlockReason}</p>
    ) : null}
  </div>
)
}