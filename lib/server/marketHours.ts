// Server only — do not import in client components

import { toZonedTime, formatInTimeZone } from 'date-fns-tz'

export type MarketWindow =
  | 'pre_market'
  | 'market_open'
  | 'post_market'
  | 'closed'

const MARKET_TIMEZONE = 'America/New_York'

function getEtParts(now: Date) {
  const zoned = toZonedTime(now, MARKET_TIMEZONE)

  return {
    zoned,
    dayOfWeek: zoned.getDay(),
    hours: zoned.getHours(),
    minutes: zoned.getMinutes(),
    totalMinutes: zoned.getHours() * 60 + zoned.getMinutes(),
  }
}

function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6
}

export function isMarketHours(now: Date = new Date()): boolean {
  const { dayOfWeek, totalMinutes } = getEtParts(now)

  if (isWeekend(dayOfWeek)) {
    return false
  }

  const marketOpenMinutes = 9 * 60 + 30
  const marketCloseMinutes = 16 * 60

  return totalMinutes >= marketOpenMinutes && totalMinutes <= marketCloseMinutes
}

export function getMarketWindow(now: Date = new Date()): MarketWindow {
  const { dayOfWeek, totalMinutes } = getEtParts(now)

  if (isWeekend(dayOfWeek)) {
    return 'closed'
  }

  const preMarketStart = 4 * 60
  const marketOpenStart = 9 * 60 + 30
  const marketOpenEnd = 16 * 60
  const postMarketStart = 16 * 60 + 1
  const postMarketEnd = 20 * 60

  if (totalMinutes >= preMarketStart && totalMinutes < marketOpenStart) {
    return 'pre_market'
  }

  if (totalMinutes >= marketOpenStart && totalMinutes <= marketOpenEnd) {
    return 'market_open'
  }

  if (totalMinutes >= postMarketStart && totalMinutes <= postMarketEnd) {
    return 'post_market'
  }

  return 'closed'
}

export function getCadenceWindowKey(
  jobType: string,
  now: Date = new Date()
): string {
  const dateKey = formatInTimeZone(now, MARKET_TIMEZONE, 'yyyy-MM-dd')
  const window = getMarketWindow(now)

  return `${jobType}:${dateKey}:${window}`
}