export type PositionSizingInput = {
  ticker: string
  currentPrice: number
  confidence: 'High' | 'Medium' | 'Low'
  sector: string
  bucket: string

  totalPortfolioValue: number
  currentCashValue: number

  existingPositionValue: number

  currentSectorValue: number
  sectorTargetMaxPct: number | null

  currentBucketValue: number
  bucketTargetMaxPct: number | null
}

export type PositionSizingResult = {
  maxPositionPct: number
  maxPositionValue: number
  remainingRoom: number
  sectorCap: number | null
  sectorRoom: number | null
  bucketCap: number | null
  bucketRoom: number | null
  cashFloorReserve: number
  availableCash: number
  suggestedInvestment: number
  suggestedShares: number
  constraintHit: string
  warnings: string[]
}

export function calculatePositionSize(
  input: PositionSizingInput
): PositionSizingResult {
  const {
    currentPrice,
    confidence,
    sector,
    bucket,
    totalPortfolioValue,
    currentCashValue,
    existingPositionValue,
    currentSectorValue,
    sectorTargetMaxPct,
    currentBucketValue,
    bucketTargetMaxPct,
  } = input

  const warnings: string[] = []

  const maxPositionPct =
    confidence === 'High' ? 10 : confidence === 'Medium' ? 7 : 5

  const maxPositionValue = totalPortfolioValue * (maxPositionPct / 100)
  const remainingRoom = Math.max(0, maxPositionValue - existingPositionValue)

  let sectorCap: number | null = null
  let sectorRoom: number | null = null
  if (sectorTargetMaxPct != null) {
    sectorCap = totalPortfolioValue * (sectorTargetMaxPct / 100)
    sectorRoom = Math.max(0, sectorCap - currentSectorValue)
  }

  let bucketCap: number | null = null
  let bucketRoom: number | null = null
  if (bucketTargetMaxPct != null) {
    bucketCap = totalPortfolioValue * (bucketTargetMaxPct / 100)
    bucketRoom = Math.max(0, bucketCap - currentBucketValue)
  }

  const cashFloorPct = 5
  const cashFloorReserve = totalPortfolioValue * (cashFloorPct / 100)
  const availableCash = Math.max(0, currentCashValue - cashFloorReserve)

  if (currentCashValue < cashFloorReserve) {
    warnings.push(
      `Cash is below the ${cashFloorPct}% floor ($${cashFloorReserve.toFixed(0)}). Consider trimming before adding.`
    )
  }

  const constraints: { name: string; value: number }[] = [
    { name: 'Position size limit', value: remainingRoom },
    { name: 'Available cash', value: availableCash },
  ]

  if (sectorRoom != null) {
    constraints.push({ name: `Sector cap (${sector})`, value: sectorRoom })
  }

  if (bucketRoom != null) {
    constraints.push({ name: `Bucket cap (${bucket})`, value: bucketRoom })
  }

  const bindingConstraint = constraints.reduce((min, current) =>
    current.value < min.value ? current : min
  )

  const suggestedInvestment = Math.max(0, bindingConstraint.value)
  const suggestedShares =
    currentPrice > 0 ? Math.floor(suggestedInvestment / currentPrice) : 0

  if (
    suggestedShares === 0 &&
    suggestedInvestment > 0 &&
    currentPrice > suggestedInvestment
  ) {
    warnings.push(
      `Share price ($${currentPrice.toFixed(2)}) exceeds the available investment amount. Consider if a partial share is available through your broker.`
    )
  }

  return {
    maxPositionPct,
    maxPositionValue,
    remainingRoom,
    sectorCap,
    sectorRoom,
    bucketCap,
    bucketRoom,
    cashFloorReserve,
    availableCash,
    suggestedInvestment,
    suggestedShares,
    constraintHit: bindingConstraint.name,
    warnings,
  }
}