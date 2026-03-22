// Server only — do not import in client components

import { createClient } from '@supabase/supabase-js'

export type ScanLogStatus = 'started' | 'completed' | 'skipped' | 'failed'

export type ScanLogEntry = {
  id: string
  jobType: string
  windowKey: string
  ticker?: string
  status: ScanLogStatus
  message?: string
  changesJson?: Record<string, unknown>
  startedAt: string
  finishedAt?: string
}

type StartScanLogParams = {
  userId: string
  jobType: string
  windowKey: string
  ticker?: string
  entityType?: string
  entityId?: string
}

type FinishScanLogParams = {
  logId: string
  status: ScanLogStatus
  message?: string
  changesJson?: Record<string, unknown>
}

type HasAlreadyProcessedParams = {
  jobType: string
  windowKey: string
  ticker?: string
}

function getServiceRoleSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function startScanLog(
  params: StartScanLogParams
): Promise<string | null> {
  try {
    const supabase = getServiceRoleSupabaseClient()

    if (!supabase) {
      console.error('[scanLog.startScanLog] Missing Supabase environment variables')
      return null
    }

    const payload = {
      user_id: params.userId,
      job_type: params.jobType,
      window_key: params.windowKey,
      ticker: params.ticker ?? null,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      status: 'started' as ScanLogStatus,
      started_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('scan_logs')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      console.error('[scanLog.startScanLog] Insert failed:', error.message)
      return null
    }

    return data?.id ?? null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[scanLog.startScanLog] Unexpected error:', message)
    return null
  }
}

export async function finishScanLog(
  params: FinishScanLogParams
): Promise<void> {
  try {
    const supabase = getServiceRoleSupabaseClient()

    if (!supabase) {
      console.error('[scanLog.finishScanLog] Missing Supabase environment variables')
      return
    }

    const updatePayload = {
      status: params.status,
      message: params.message ?? null,
      changes_json: params.changesJson ?? {},
      finished_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('scan_logs')
      .update(updatePayload)
      .eq('id', params.logId)

    if (error) {
      console.error('[scanLog.finishScanLog] Update failed:', error.message)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[scanLog.finishScanLog] Unexpected error:', message)
  }
}

export async function hasAlreadyProcessed(
  params: HasAlreadyProcessedParams
): Promise<boolean> {
  try {
    const supabase = getServiceRoleSupabaseClient()

    if (!supabase) {
      console.error(
        '[scanLog.hasAlreadyProcessed] Missing Supabase environment variables'
      )
      return false
    }

    let query = supabase
      .from('scan_logs')
      .select('id')
      .eq('job_type', params.jobType)
      .eq('window_key', params.windowKey)
      .eq('status', 'completed')
      .limit(1)

    if (params.ticker) {
      query = query.eq('ticker', params.ticker)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('[scanLog.hasAlreadyProcessed] Query failed:', error.message)
      return false
    }

    return !!data
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[scanLog.hasAlreadyProcessed] Unexpected error:', message)
    return false
  }
}