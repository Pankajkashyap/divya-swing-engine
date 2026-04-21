export function isValidPositiveNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}