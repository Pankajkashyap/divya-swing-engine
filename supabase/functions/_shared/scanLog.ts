// Server only — do not import in client components

import { createClient } from 'npm:@supabase/supabase-js@2'
import { edgeConfig } from './_shared/config.ts'


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

export async function startScanLog(params: {
  userId: string
  jobType: string
  windowKey: string
  ticker?: string
  entityType?: string
  entityId?: string
}): Promise<string | null> {
  try {
    const supabase = getServiceRoleSupabaseClient()

    if (!supabase) {
      console.error('[scanLog.startScanLog] Missing Supabase environment variables')
      return null
    }

    const { data, error } = await supabase
      .from('scan_logs')
      .insert({
        user_id: params.userId,
        job_type: params.jobType,
        window_key: params.windowKey,
        ticker: params.ticker ?? null,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        status: 'started',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('[scanLog.startScanLog] Insert failed:', error.message)
      return null
    }

    return data?.id ?? null
  } catch (error) {
    console.error('[scanLog.startScanLog] Unexpected error:', getErrorMessage(error))
    return null
  }
}

export async function finishScanLog(params: {
  logId: string
  status: ScanLogStatus
  message?: string
  changesJson?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = getServiceRoleSupabaseClient()

    if (!supabase) {
      console.error('[scanLog.finishScanLog] Missing Supabase environment variables')
      return
    }

    const { error } = await supabase
      .from('scan_logs')
      .update({
        status: params.status,
        message: params.message ?? null,
        changes_json: params.changesJson ?? {},
        finished_at: new Date().toISOString(),
      })
      .eq('id', params.logId)

    if (error) {
      console.error('[scanLog.finishScanLog] Update failed:', error.message)
    }
  } catch (error) {
    console.error('[scanLog.finishScanLog] Unexpected error:', getErrorMessage(error))
  }
}

export async function hasAlreadyProcessed(params: {
  jobType: string
  windowKey: string
  ticker?: string
}): Promise<boolean> {
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
    console.error(
      '[scanLog.hasAlreadyProcessed] Unexpected error:',
      getErrorMessage(error)
    )
    return false
  }
}

function getServiceRoleSupabaseClient() {
  const supabaseUrl = edgeConfig.supabaseUrl
  const serviceRoleKey = edgeConfig.supabaseServiceRoleKey

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}