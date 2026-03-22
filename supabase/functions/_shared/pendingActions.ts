// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null

export type CreatePendingActionParams = {
  userId: string
  ticker: string
  actionType:
    | 'buy_signal'
    | 'stop_alert'
    | 'target_alert'
    | 'watchlist_review'
    | 'manual_reconciliation'
  urgency: 'urgent' | 'normal' | 'low'
  title: string
  message?: string
  tradeId?: string
  watchlistId?: string
  tradePlanId?: string
  payloadJson?: Record<string, unknown>
  expiresAt?: string
}

export type PendingActionResult =
  | { created: true; id: string }
  | { created: false; reason: string }

export async function createPendingAction(
  params: CreatePendingActionParams
): Promise<PendingActionResult> {
  try {
    if (!supabase) {
      return { created: false, reason: 'Supabase environment not configured' }
    }

    const { data, error } = await supabase
      .from('pending_actions')
      .insert({
        user_id: params.userId,
        ticker: params.ticker,
        action_type: params.actionType,
        state: 'awaiting_confirmation',
        urgency: params.urgency,
        title: params.title,
        message: params.message ?? null,
        trade_id: params.tradeId ?? null,
        watchlist_id: params.watchlistId ?? null,
        trade_plan_id: params.tradePlanId ?? null,
        payload_json: params.payloadJson ?? {},
        created_at: new Date().toISOString(),
        expires_at: params.expiresAt ?? null,
      })
      .select('id')
      .single()

    if (error || !data?.id) {
      return {
        created: false,
        reason: error?.message ?? 'Failed to create pending action',
      }
    }

    return { created: true, id: data.id }
  } catch (error) {
    return {
      created: false,
      reason: getErrorMessage(error),
    }
  }
}

export async function resolvePendingAction(params: {
  id: string
  resolvedState: 'executed' | 'dismissed' | 'expired'
}): Promise<void> {
  try {
    if (!supabase) {
      console.error(
        '[pendingActions.resolvePendingAction] Supabase environment not configured'
      )
      return
    }

    const { error } = await supabase
      .from('pending_actions')
      .update({
        state: params.resolvedState,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      console.error(
        '[pendingActions.resolvePendingAction] Update failed:',
        error.message
      )
    }
  } catch (error) {
    console.error(
      '[pendingActions.resolvePendingAction] Unexpected error:',
      getErrorMessage(error)
    )
  }
}

export async function snoozePendingAction(params: {
  id: string
  snoozedUntil: string
}): Promise<void> {
  try {
    if (!supabase) {
      console.error(
        '[pendingActions.snoozePendingAction] Supabase environment not configured'
      )
      return
    }

    const { error } = await supabase
      .from('pending_actions')
      .update({
        state: 'snoozed',
        snoozed_until: params.snoozedUntil,
      })
      .eq('id', params.id)

    if (error) {
      console.error(
        '[pendingActions.snoozePendingAction] Update failed:',
        error.message
      )
    }
  } catch (error) {
    console.error(
      '[pendingActions.snoozePendingAction] Unexpected error:',
      getErrorMessage(error)
    )
  }
}

export async function getUnresolvedPendingAction(params: {
  userId: string
  ticker: string
  actionType: string
}): Promise<{ id: string } | null> {
  try {
    if (!supabase) {
      console.error(
        '[pendingActions.getUnresolvedPendingAction] Supabase environment not configured'
      )
      return null
    }

    const { data, error } = await supabase
      .from('pending_actions')
      .select('id')
      .eq('user_id', params.userId)
      .eq('ticker', params.ticker)
      .eq('action_type', params.actionType)
      .in('state', ['awaiting_confirmation', 'snoozed'])
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error(
        '[pendingActions.getUnresolvedPendingAction] Query failed:',
        error.message
      )
      return null
    }

    return data?.id ? { id: data.id } : null
  } catch (error) {
    console.error(
      '[pendingActions.getUnresolvedPendingAction] Unexpected error:',
      getErrorMessage(error)
    )
    return null
  }
}

export async function expireStaleActions(): Promise<number> {
  try {
    if (!supabase) {
      console.error(
        '[pendingActions.expireStaleActions] Supabase environment not configured'
      )
      return 0
    }

    const nowIso = new Date().toISOString()

    const { data, error } = await supabase
      .from('pending_actions')
      .update({
        state: 'expired',
        resolved_at: nowIso,
      })
      .eq('action_type', 'buy_signal')
      .not('expires_at', 'is', null)
      .lt('expires_at', nowIso)
      .not('state', 'in', '("executed","dismissed","expired")')
      .select('id')

    if (error) {
      console.error(
        '[pendingActions.expireStaleActions] Update failed:',
        error.message
      )
      return 0
    }

    return data?.length ?? 0
  } catch (error) {
    console.error(
      '[pendingActions.expireStaleActions] Unexpected error:',
      getErrorMessage(error)
    )
    return 0
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}