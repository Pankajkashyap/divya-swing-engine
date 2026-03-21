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
  )
}