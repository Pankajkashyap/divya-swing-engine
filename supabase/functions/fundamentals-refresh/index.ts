// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateCronSecret } from '../_shared/cronAuth.ts'
import { getCadenceWindowKey } from '../_shared/marketHours.ts'
import {
  startScanLog,
  finishScanLog,
  hasAlreadyProcessed,
} from '../_shared/scanLog.ts'
import { marketDataProvider } from '../_shared/marketDataProvider/index.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

type UserSettingsRow = {
  user_id: string
}

type WatchlistRow = {
  id: string
  ticker: string
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function safeFinishScanLog(params: {
  logId: string | null
  status: 'started' | 'completed' | 'skipped' | 'failed'
  message?: string
  changesJson?: Record<string, unknown>
}): Promise<void> {
  if (!params.logId) return

  await finishScanLog({
    logId: params.logId,
    status: params.status,
    message: params.message,
    changesJson: params.changesJson,
  })
}

Deno.serve(async (request: Request) => {
  let logId: string | null = null

  try {
    const authResult = validateCronSecret(request)

    if (!authResult.authorised) {
      return jsonResponse(
        { success: false, reason: authResult.reason },
        401
      )
    }

    const { data: userSettings, error: userSettingsError } = await supabase
      .from('user_settings')
      .select('user_id')
      .limit(1)
      .maybeSingle()

    if (userSettingsError) {
      return jsonResponse(
        {
          success: false,
          reason: `Failed to load user settings: ${userSettingsError.message}`,
        },
        500
      )
    }

    if (!userSettings?.user_id) {
      return jsonResponse(
        { success: false, reason: 'No user settings found' },
        500
      )
    }

    const userId = (userSettings as UserSettingsRow).user_id
    const windowKey = getCadenceWindowKey('fundamentals-refresh')

    const alreadyProcessed = await hasAlreadyProcessed({
      jobType: 'fundamentals-refresh',
      windowKey,
    })

    if (alreadyProcessed) {
      return jsonResponse(
        { skipped: true, reason: 'Already processed this window' },
        200
      )
    }

    logId = await startScanLog({
      userId,
      jobType: 'fundamentals-refresh',
      windowKey,
    })

    const { data: watchlistRows, error: watchlistError } = await supabase
      .from('watchlist')
      .select('id, ticker')
      .eq('user_id', userId)
      .not('signal_state', 'in', '("archived")')
      .order('last_fundamentals_at', { ascending: true, nullsFirst: true })
      .limit(10)

    if (watchlistError) {
      await safeFinishScanLog({
        logId,
        status: 'failed',
        message: `Failed to load watchlist batch: ${watchlistError.message}`,
      })

      return jsonResponse(
        { success: false, reason: 'Failed to load watchlist batch' },
        500
      )
    }

    if (!watchlistRows || watchlistRows.length === 0) {
      await safeFinishScanLog({
        logId,
        status: 'completed',
        message: 'No watchlist stocks to refresh',
        changesJson: {
          processed: 0,
          refreshed: 0,
          stale: 0,
          tickers: [],
          windowKey,
        },
      })

      return jsonResponse(
        {
          success: true,
          processed: 0,
          refreshed: 0,
          stale: 0,
          windowKey,
        },
        200
      )
    }

    let processed = 0
    let refreshed = 0
    let stale = 0
    const tickers: string[] = []

    for (const stock of watchlistRows as WatchlistRow[]) {
      try {
        processed += 1
        tickers.push(stock.ticker)

        const fundamentals = await marketDataProvider.fetchFundamentals(stock.ticker)

        if (!fundamentals) {
          const { error: staleUpdateError } = await supabase
            .from('watchlist')
            .update({
              data_status: 'stale',
              last_fundamentals_at: new Date().toISOString(),
            })
            .eq('id', stock.id)

          if (staleUpdateError) {
            console.error(
              `[fundamentals-refresh] Failed to mark ${stock.ticker} stale: ${staleUpdateError.message}`
            )
          } else {
            stale += 1
          }

          continue
        }

        const updates: Record<string, unknown> = {
          last_fundamentals_at: new Date().toISOString(),
          data_status: 'fresh',
        }

        if (fundamentals.epsGrowthPct !== null) {
          updates.eps_growth_pct = fundamentals.epsGrowthPct
        }

        if (fundamentals.revenueGrowthPct !== null) {
          updates.revenue_growth_pct = fundamentals.revenueGrowthPct
        }

        if (fundamentals.industryGroupRank !== null) {
          updates.industry_group_rank = fundamentals.industryGroupRank
        }

        if (fundamentals.epsAccelerating !== null) {
          updates.eps_accelerating = fundamentals.epsAccelerating
        }

        if (fundamentals.accDistRating !== null) {
          updates.acc_dist_rating = fundamentals.accDistRating
        }

        const { error: updateError } = await supabase
          .from('watchlist')
          .update(updates)
          .eq('id', stock.id)

        if (updateError) {
          console.error(
            `[fundamentals-refresh] Failed to update ${stock.ticker}: ${updateError.message}`
          )
          continue
        }

        refreshed += 1
      } catch (error) {
        console.error(
          `[fundamentals-refresh] Processing failed for ${stock.ticker}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message: `Fundamentals refresh complete. Refreshed: ${refreshed}, stale: ${stale}`,
      changesJson: {
        processed,
        refreshed,
        stale,
        tickers,
        windowKey,
      },
    })

    return jsonResponse(
      {
        success: true,
        processed,
        refreshed,
        stale,
        windowKey,
      },
      200
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unexpected fundamentals-refresh error'

    await safeFinishScanLog({
      logId,
      status: 'failed',
      message: errorMessage,
    })

    return jsonResponse(
      { success: false, reason: errorMessage },
      500
    )
  }
})