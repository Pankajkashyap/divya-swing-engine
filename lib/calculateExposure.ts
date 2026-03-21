export function calculateExposure(
  trades: {
    entry_price_actual: number | null
    shares_entered: number | null
  }[],
  portfolioValue: number
) {
  const openPositionValue = trades.reduce((sum, trade) => {
    const entry = Number(trade.entry_price_actual ?? 0)
    const shares = Number(trade.shares_entered ?? 0)
    return sum + entry * shares
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