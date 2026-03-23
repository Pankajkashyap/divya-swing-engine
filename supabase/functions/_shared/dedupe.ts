// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { edgeConfig } from './config.ts'

const supabaseUrl = edgeConfig.supabaseUrl
const serviceRoleKey = edgeConfig.supabaseServiceRoleKey

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null

export type DedupeCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; cooldownUntil?: string }

export function buildDedupeKey(params: {
  userId: string
  ticker: string
  triggerType: string
  triggerState: string
}): string {
  return `${params.userId}:${params.ticker}:${params.triggerType}:${params.triggerState}`
}

export async function checkDedupe(params: {
  userId: string
  ticker: string
  triggerType: string
  triggerState: string
}): Promise<DedupeCheckResult> {
  try {
    if (!supabase) {
      return { allowed: false, reason: 'Dedupe check failed' }
    }

    const dedupeKey = buildDedupeKey(params)

    const { data, error } = await supabase
      .from('notifications')
      .select('cooldown_until')
      .eq('dedupe_key', dedupeKey)
      .is('resolved_at', null)
      .limit(1)
      .maybeSingle()

    if (error) {
      return { allowed: false, reason: 'Dedupe check failed' }
    }

    if (!data) {
      return { allowed: true }
    }

    const cooldownUntil =
      typeof data.cooldown_until === 'string' ? data.cooldown_until : null

    if (cooldownUntil && new Date(cooldownUntil).getTime() > Date.now()) {
      return {
        allowed: false,
        reason: 'Cooldown active',
        cooldownUntil,
      }
    }

    return { allowed: false, reason: 'Notification already active' }
  } catch {
    return { allowed: false, reason: 'Dedupe check failed' }
  }
}

export async function recordNotification(params: {
  userId: string
  ticker: string
  triggerType: string
  triggerState: string
  tradeId?: string
  pendingActionId?: string
  cooldownMinutes?: number
}): Promise<void> {
  try {
    if (!supabase) {
      console.error(
        '[dedupe.recordNotification] Supabase environment not configured'
      )
      return
    }

    const dedupeKey = buildDedupeKey(params)
    const now = new Date()
    const cooldownUntil =
      typeof params.cooldownMinutes === 'number'
        ? new Date(
            now.getTime() + params.cooldownMinutes * 60 * 1000
          ).toISOString()
        : null

    const { error } = await supabase.from('notifications').upsert(
      {
        user_id: params.userId,
        ticker: params.ticker,
        trigger_type: params.triggerType,
        trigger_state: params.triggerState,
        dedupe_key: dedupeKey,
        trade_id: params.tradeId ?? null,
        pending_action_id: params.pendingActionId ?? null,
        sent_at: now.toISOString(),
        cooldown_until: cooldownUntil,
      },
      { onConflict: 'dedupe_key' }
    )

    if (error) {
      console.error(
        '[dedupe.recordNotification] Upsert failed:',
        error.message
      )
    }
  } catch (error) {
    console.error(
      '[dedupe.recordNotification] Unexpected error:',
      getErrorMessage(error)
    )
  }
}

export async function resolveNotification(params: {
  dedupeKey: string
}): Promise<void> {
  try {
    if (!supabase) {
      console.error(
        '[dedupe.resolveNotification] Supabase environment not configured'
      )
      return
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        resolved_at: new Date().toISOString(),
      })
      .eq('dedupe_key', params.dedupeKey)

    if (error) {
      console.error(
        '[dedupe.resolveNotification] Update failed:',
        error.message
      )
    }
  } catch (error) {
    console.error(
      '[dedupe.resolveNotification] Unexpected error:',
      getErrorMessage(error)
    )
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}