export function calculateExposure(
  trades: {
    entry_price_actual: number | null
    shares_entered: number | null
    shares_exited?: number | null
  }[],
  portfolioValue: number
) {
  const openPositionValue = trades.reduce((sum, trade) => {
    const entry = Number(trade.entry_price_actual ?? 0)
    const enteredShares = Number(trade.shares_entered ?? 0)
    const exitedShares = Number(trade.shares_exited ?? 0)
    const openShares = Math.max(enteredShares - exitedShares, 0)

    return sum + entry * openShares
  }, 0)

  const exposurePct =
    portfolioValue > 0
      ? Number(((openPositionValue / portfolioValue) * 100).toFixed(2))
      : 0

  return {
    openPositionValue,
    exposurePct,
  }
}