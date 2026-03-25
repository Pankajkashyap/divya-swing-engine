// Server only — do not import in client components

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateCronSecret } from '../_shared/cronAuth.ts'
import {
  getCadenceWindowKey,
  getMarketWindow,
  isMarketHours,
} from '../_shared/marketHours.ts'
import { startScanLog, finishScanLog, hasAlreadyProcessed } from '../_shared/scanLog.ts'
import { marketDataProvider } from '../_shared/marketDataProvider/index.ts'
import {
  createPendingAction,
  getUnresolvedPendingAction,
} from '../_shared/pendingActions.ts'
import { checkDedupe, recordNotification } from '../_shared/dedupe.ts'
import { sendEmail } from '../_shared/email/resend.ts'
import { tradeInstructionCard } from '../_shared/email/templates/tradeInstructionCard.ts'
import { edgeConfig } from '../_shared/config.ts'

const supabase = createClient(
  edgeConfig.supabaseUrl,
  edgeConfig.supabaseServiceRoleKey
)

type MarketSnapshot = {
  market_phase: string | null
  max_long_exposure_pct: number | null
}

type WatchlistRow = {
  id: string
  ticker: string
  company_name: string | null
  setup_grade: string | null
  trend_template_pass: boolean | null
  volume_dry_up_pass: boolean | null
  rs_line_confirmed: boolean | null
  base_pattern_valid: boolean | null
  entry_near_pivot: boolean | null
  volume_breakout_confirmed: boolean | null
  liquidity_pass: boolean | null
  earnings_within_2_weeks: boolean | null
  binary_event_risk: boolean | null
  eps_growth_pct: number | null
  eps_accelerating: boolean | null
  revenue_growth_pct: number | null
  acc_dist_rating: string | null
  industry_group_rank: number | null
  consecutive_fail_count: number | null
  pivot_price: number | null
  entry_zone_low: number | null
  entry_zone_high: number | null
  stop_price: number | null
  target_1_price: number | null
  target_2_price: number | null
}

type EvaluateSetupResult = {
  market_phase_pass: boolean
  trend_template_pass: boolean
  liquidity_pass: boolean
  base_pattern_valid: boolean
  volume_pattern_valid: boolean
  rs_line_confirmed: boolean
  entry_near_pivot_pass: boolean
  volume_breakout_pass: boolean
  earnings_risk_flag: boolean
  binary_event_flag: boolean
  setup_grade: string | null
  fundamental_pass: boolean
  score_total: number
  verdict: 'pass' | 'watch' | 'fail'
  fail_reason: string | null
  notes: string | null
}

type TradePlanOutput = {
  risk_pct: number
  dollar_risk: number
  entry_price: number
  stop_price: number
  risk_per_share: number
  planned_shares: number
  position_value: number
  final_shares: number
  final_position_value: number
  expected_rr: number
  approval_status: 'approved' | 'blocked'
  blocked_reason: string | null
}

type StockSummary = {
  ticker: string
  verdict: 'pass' | 'watch' | 'fail'
  signalCreated: boolean
  emailSent: boolean | null
  emailFailReason: string | null
}

type UserSettingsRow = {
  user_id: string
  portfolio_value: number | null
  notification_email: string | null
  scan_schedule: 'evening_only' | 'three_times_daily' | null
  buy_signal_expiry_days: 1 | 2 | 3 | null
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getTodayDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function getExpiryDate(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(21, 0, 0, 0) // 9 PM UTC ≈ 4–5 PM ET depending on DST
  return date.toISOString()
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

function evaluateSetup(
  market: MarketSnapshot,
  stock: WatchlistRow
): EvaluateSetupResult {
  let fundamental_pass = true
  const fundamental_reasons: string[] = []

  if ((stock.eps_growth_pct ?? 0) < 25) {
    fundamental_pass = false
    fundamental_reasons.push('EPS growth < 25%')
  }

  if ((stock.revenue_growth_pct ?? 0) < 25) {
    fundamental_pass = false
    fundamental_reasons.push('Revenue growth < 25%')
  }

  if (stock.acc_dist_rating === 'D' || stock.acc_dist_rating === 'E') {
    fundamental_pass = false
    fundamental_reasons.push('Weak institutional accumulation (A/D)')
  }

  if ((stock.industry_group_rank ?? 999) > 40) {
    fundamental_pass = false
    fundamental_reasons.push('Industry group not in top 20%')
  }

  const fundamental_reason = fundamental_reasons.join(', ')

  const market_phase_pass =
    market.market_phase !== 'correction' &&
    market.market_phase !== 'bear'

  const trend_template_pass = stock.trend_template_pass === true
  const liquidity_pass = stock.liquidity_pass === true
  const base_pattern_valid = stock.base_pattern_valid === true
  const volume_pattern_valid = stock.volume_dry_up_pass === true
  const rs_line_confirmed = stock.rs_line_confirmed === true
  const entry_near_pivot_pass = stock.entry_near_pivot === true
  const volume_breakout_pass = stock.volume_breakout_confirmed === true

  const earnings_risk_flag = stock.earnings_within_2_weeks === true
  const binary_event_flag = stock.binary_event_risk === true

  let score_total = 0

  if (market_phase_pass) score_total++
  if (trend_template_pass) score_total++
  if (liquidity_pass) score_total++
  if (base_pattern_valid) score_total++
  if (volume_pattern_valid) score_total++
  if (rs_line_confirmed) score_total++
  if (entry_near_pivot_pass) score_total++
  if (volume_breakout_pass) score_total++
  if (fundamental_pass) score_total++

  let verdict: 'pass' | 'watch' | 'fail' = 'pass'
  let fail_reason: string | null = null

  if (!market_phase_pass) {
    verdict = 'fail'
    fail_reason = 'Unfavorable market conditions'
  } else if (!trend_template_pass) {
    verdict = 'fail'
    fail_reason = 'Trend template not satisfied'
  } else if (!liquidity_pass) {
    verdict = 'fail'
    fail_reason = 'Liquidity gate failed'
  } else if (!base_pattern_valid) {
    verdict = 'fail'
    fail_reason = 'No valid base pattern'
  } else if (!rs_line_confirmed) {
    verdict = 'fail'
    fail_reason = 'RS line not confirming'
  } else if (!fundamental_pass) {
    verdict = 'fail'
    fail_reason = fundamental_reason
  } else {
    const softFailLabels: string[] = []

    if (!volume_pattern_valid) {
      softFailLabels.push('Volume dry-up not confirmed')
    }

    if (!entry_near_pivot_pass) {
      softFailLabels.push('Entry near pivot not confirmed')
    }

    if (!volume_breakout_pass) {
      softFailLabels.push('Breakout volume not confirmed')
    }

    if (softFailLabels.length >= 2) {
      verdict = 'watch'
      fail_reason = softFailLabels.join(' and ')
    }

    if (earnings_risk_flag || binary_event_flag) {
      if (verdict === 'watch' && fail_reason) {
        fail_reason = `${fail_reason}; Risk conditions not ideal`
      } else {
        verdict = 'watch'
        fail_reason = 'Risk conditions not ideal'
      }
    }
  }

  return {
    market_phase_pass,
    trend_template_pass,
    liquidity_pass,
    base_pattern_valid,
    volume_pattern_valid,
    rs_line_confirmed,
    entry_near_pivot_pass,
    volume_breakout_pass,
    earnings_risk_flag,
    binary_event_flag,
    setup_grade: stock.setup_grade,
    fundamental_pass,
    score_total,
    verdict,
    fail_reason,
    notes: null,
  }
}

function generateTradePlan(
  market: MarketSnapshot,
  stock: WatchlistRow,
  portfolioValue: number
): TradePlanOutput {
  const grade = stock.setup_grade ?? 'C'

  let riskPct = 0

  if (grade === 'A+') riskPct = 2
  else if (grade === 'A') riskPct = 1
  else if (grade === 'B') riskPct = 0.5
  else riskPct = 0.25

  if (market.market_phase === 'under_pressure') {
    riskPct *= 0.5
  }

  if (market.market_phase === 'correction' || market.market_phase === 'bear') {
    return {
      risk_pct: 0,
      dollar_risk: 0,
      entry_price: 0,
      stop_price: 0,
      risk_per_share: 0,
      planned_shares: 0,
      position_value: 0,
      final_shares: 0,
      final_position_value: 0,
      expected_rr: 0,
      approval_status: 'blocked',
      blocked_reason: 'Market not favorable for new long trades',
    }
  }

  const entry = stock.entry_zone_low ?? stock.pivot_price ?? 0
  const stop = stock.stop_price ?? 0
  const target1 = stock.target_1_price ?? 0

  if (!portfolioValue || portfolioValue <= 0) {
    return {
      risk_pct: riskPct,
      dollar_risk: 0,
      entry_price: 0,
      stop_price: 0,
      risk_per_share: 0,
      planned_shares: 0,
      position_value: 0,
      final_shares: 0,
      final_position_value: 0,
      expected_rr: 0,
      approval_status: 'blocked',
      blocked_reason: 'Invalid portfolio value',
    }
  }

  if (!entry || !stop) {
    return {
      risk_pct: riskPct,
      dollar_risk: 0,
      entry_price: entry,
      stop_price: stop,
      risk_per_share: 0,
      planned_shares: 0,
      position_value: 0,
      final_shares: 0,
      final_position_value: 0,
      expected_rr: 0,
      approval_status: 'blocked',
      blocked_reason: 'Missing entry or stop price',
    }
  }

  const riskPerShare = entry - stop

  if (riskPerShare <= 0) {
    return {
      risk_pct: riskPct,
      dollar_risk: 0,
      entry_price: entry,
      stop_price: stop,
      risk_per_share: 0,
      planned_shares: 0,
      position_value: 0,
      final_shares: 0,
      final_position_value: 0,
      expected_rr: 0,
      approval_status: 'blocked',
      blocked_reason: 'Invalid stop placement',
    }
  }

  if (!target1) {
    return {
      risk_pct: riskPct,
      dollar_risk: 0,
      entry_price: entry,
      stop_price: stop,
      risk_per_share: riskPerShare,
      planned_shares: 0,
      position_value: 0,
      final_shares: 0,
      final_position_value: 0,
      expected_rr: 0,
      approval_status: 'blocked',
      blocked_reason: 'Missing target 1 price',
    }
  }

  if (target1 <= entry) {
    return {
      risk_pct: riskPct,
      dollar_risk: 0,
      entry_price: entry,
      stop_price: stop,
      risk_per_share: riskPerShare,
      planned_shares: 0,
      position_value: 0,
      final_shares: 0,
      final_position_value: 0,
      expected_rr: 0,
      approval_status: 'blocked',
      blocked_reason: 'Invalid target placement',
    }
  }

  const expectedRR = Number(((target1 - entry) / riskPerShare).toFixed(2))

  if (expectedRR < 2) {
    return {
      risk_pct: riskPct,
      dollar_risk: 0,
      entry_price: entry,
      stop_price: stop,
      risk_per_share: riskPerShare,
      planned_shares: 0,
      position_value: 0,
      final_shares: 0,
      final_position_value: 0,
      expected_rr: expectedRR,
      approval_status: 'blocked',
      blocked_reason: 'Reward/risk below minimum threshold',
    }
  }

  const dollarRisk = Number(((portfolioValue * riskPct) / 100).toFixed(2))
  const plannedShares = Math.floor(dollarRisk / riskPerShare)
  const positionValue = Number((plannedShares * entry).toFixed(2))
  const maxPositionValue = (portfolioValue * 25) / 100

  let finalShares = plannedShares
  let finalPositionValue = positionValue

  if (positionValue > maxPositionValue) {
    finalShares = Math.floor(maxPositionValue / entry)
    finalPositionValue = Number((finalShares * entry).toFixed(2))
  }

  if (stock.earnings_within_2_weeks || stock.binary_event_risk) {
    finalShares = Math.floor(finalShares * 0.5)
    finalPositionValue = Number((finalShares * entry).toFixed(2))
  }

  if (finalShares <= 0 || finalPositionValue <= 0) {
    return {
      risk_pct: riskPct,
      dollar_risk: dollarRisk,
      entry_price: entry,
      stop_price: stop,
      risk_per_share: riskPerShare,
      planned_shares: plannedShares,
      position_value: positionValue,
      final_shares: 0,
      final_position_value: 0,
      expected_rr: expectedRR,
      approval_status: 'blocked',
      blocked_reason: 'Position size too small after sizing rules',
    }
  }

  return {
    risk_pct: riskPct,
    dollar_risk: dollarRisk,
    entry_price: entry,
    stop_price: stop,
    risk_per_share: riskPerShare,
    planned_shares: plannedShares,
    position_value: positionValue,
    final_shares: finalShares,
    final_position_value: finalPositionValue,
    expected_rr: expectedRR,
    approval_status: 'approved',
    blocked_reason: null,
  }
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
      .select('user_id, portfolio_value, notification_email, scan_schedule, buy_signal_expiry_days')
      .limit(1)
      .maybeSingle()

    if (userSettingsError) {
      return jsonResponse(
        { success: false, reason: `Failed to load user settings: ${userSettingsError.message}` },
        500
      )
    }

    if (!userSettings?.user_id) {
      return jsonResponse(
        { success: false, reason: 'No user settings found' },
        500
      )
    }

    const settings = userSettings as UserSettingsRow
    const userId = settings.user_id
    const portfolioValue = Number(settings.portfolio_value ?? 0)
    const recipientEmail =
      settings.notification_email ??
      edgeConfig.authorizedUserEmail ??
      null

    const scanSchedule = settings.scan_schedule ?? 'evening_only'
    const marketWindow = getMarketWindow()

    if (scanSchedule === 'evening_only') {
      const isPostMarketRun =
        marketWindow === 'post_market' || marketWindow === 'closed'

      if (!isPostMarketRun) {
        return jsonResponse(
          {
            skipped: true,
            reason: 'Scan schedule set to evening_only — skipping non-post-market run',
          },
          200
        )
      }
    }

    const { data: market, error: marketError } = await supabase
      .from('market_snapshots')
      .select('market_phase, max_long_exposure_pct')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (marketError) {
      return jsonResponse(
        { success: false, reason: `Failed to load market snapshot: ${marketError.message}` },
        500
      )
    }

    if (!market) {
      return jsonResponse(
        { success: false, reason: 'No market snapshot found' },
        200
      )
    }

    const windowKey = getCadenceWindowKey('watchlist-evaluate')
    const alreadyProcessed = await hasAlreadyProcessed({
      jobType: 'watchlist-evaluate',
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
      jobType: 'watchlist-evaluate',
      windowKey,
    })

    const { data: watchlistBatch, error: watchlistError } = await supabase
      .from('watchlist')
      .select(`
        id,
        ticker,
        company_name,
        setup_grade,
        trend_template_pass,
        volume_dry_up_pass,
        rs_line_confirmed,
        base_pattern_valid,
        entry_near_pivot,
        volume_breakout_confirmed,
        liquidity_pass,
        earnings_within_2_weeks,
        binary_event_risk,
        eps_growth_pct,
        eps_accelerating,
        revenue_growth_pct,
        acc_dist_rating,
        industry_group_rank,
        consecutive_fail_count,
        pivot_price,
        entry_zone_low,
        entry_zone_high,
        stop_price,
        target_1_price,
        target_2_price
      `)
      .not('signal_state', 'in', '("archived","converted_to_trade")')
      .order('last_evaluated_at', { ascending: true, nullsFirst: true })
      .limit(5)

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

    if (!watchlistBatch || watchlistBatch.length === 0) {
      await safeFinishScanLog({
        logId,
        status: 'completed',
        message: 'No stocks to evaluate',
        changesJson: {
          processed: 0,
          passCount: 0,
          watchCount: 0,
          failCount: 0,
          signalsCreated: 0,
          windowKey,
          marketHours: isMarketHours(),
        },
      })

      return jsonResponse(
        {
          success: true,
          processed: 0,
          passCount: 0,
          watchCount: 0,
          failCount: 0,
          signalsCreated: 0,
          windowKey,
        },
        200
      )
    }

    let processed = 0
    let passCount = 0
    let watchCount = 0
    let failCount = 0
    let signalsCreated = 0

    const processedTickers: string[] = []
    const stockSummaries: StockSummary[] = []

    for (const stock of watchlistBatch as WatchlistRow[]) {
      try {
        let emailSent: boolean | null = null
        let emailFailReason: string | null = null

        const priceData = await marketDataProvider.fetchPrice(stock.ticker)

        if (!priceData) {
          console.warn(`[watchlist-evaluate] Skipping ${stock.ticker}: price provider returned null`)
          continue
        }

        const evaluation = evaluateSetup(market as MarketSnapshot, stock)
        const today = getTodayDateString()
        const nowIso = new Date().toISOString()

        const { error: evaluationInsertError } = await supabase
          .from('setup_evaluations')
          .insert({
            user_id: userId,
            watchlist_id: stock.id,
            evaluation_date: today,
            market_phase_pass: evaluation.market_phase_pass,
            trend_template_pass: evaluation.trend_template_pass,
            liquidity_pass: evaluation.liquidity_pass,
            base_pattern_valid: evaluation.base_pattern_valid,
            volume_pattern_valid: evaluation.volume_pattern_valid,
            rs_line_confirmed: evaluation.rs_line_confirmed,
            entry_near_pivot_pass: evaluation.entry_near_pivot_pass,
            volume_breakout_pass: evaluation.volume_breakout_pass,
            earnings_risk_flag: evaluation.earnings_risk_flag,
            binary_event_flag: evaluation.binary_event_flag,
            setup_grade: evaluation.setup_grade,
            score_total: evaluation.score_total,
            verdict: evaluation.verdict,
            fail_reason: evaluation.fail_reason,
            notes: evaluation.notes,
          })

        if (evaluationInsertError) {
          console.error(
            `[watchlist-evaluate] Failed to insert evaluation for ${stock.ticker}: ${evaluationInsertError.message}`
          )
          continue
        }

        const newConsecutiveFailCount =
          evaluation.verdict === 'fail'
            ? (stock.consecutive_fail_count ?? 0) + 1
            : 0

        const { error: watchlistUpdateError } = await supabase
          .from('watchlist')
          .update({
            last_evaluated_at: nowIso,
            consecutive_fail_count: newConsecutiveFailCount,
            signal_state: 'evaluated',
            data_status: 'fresh',
          })
          .eq('id', stock.id)

        if (watchlistUpdateError) {
          console.error(
            `[watchlist-evaluate] Failed to update watchlist row for ${stock.ticker}: ${watchlistUpdateError.message}`
          )
        }

        processed += 1
        processedTickers.push(stock.ticker)

        if (evaluation.verdict === 'pass') passCount += 1
        if (evaluation.verdict === 'watch') watchCount += 1
        if (evaluation.verdict === 'fail') failCount += 1

        if (evaluation.verdict !== 'pass') {
          stockSummaries.push({
            ticker: stock.ticker,
            verdict: evaluation.verdict,
            signalCreated: false,
            emailSent,
            emailFailReason,
          })
          continue
        }

        let tradePlanId: string | null = null
        let plan: TradePlanOutput | null = null

        try {
          plan = generateTradePlan(
            market as MarketSnapshot,
            stock,
            portfolioValue
          )

          const { data: insertedTradePlan, error: tradePlanInsertError } =
            await supabase
              .from('trade_plans')
              .insert({
                user_id: userId,
                watchlist_id: stock.id,
                source_watchlist_id: stock.id,
                generated_by: 'automation',
                plan_date: today,
                side: 'long',
                portfolio_value: portfolioValue,
                risk_pct: plan.risk_pct,
                dollar_risk: plan.dollar_risk,
                entry_price: plan.entry_price,
                stop_price: plan.stop_price,
                risk_per_share: plan.risk_per_share,
                planned_shares: plan.planned_shares,
                position_value: plan.position_value,
                final_shares: plan.final_shares,
                final_position_value: plan.final_position_value,
                expected_rr: plan.expected_rr,
                approval_status: plan.approval_status,
                blocked_reason: plan.blocked_reason,
              })
              .select('id')
              .single()

          if (tradePlanInsertError || !insertedTradePlan?.id) {
            console.error(
              `[watchlist-evaluate] Stage 1 failed for ${stock.ticker}: ${tradePlanInsertError?.message ?? 'Trade plan insert failed'}`
            )
            stockSummaries.push({
              ticker: stock.ticker,
              verdict: evaluation.verdict,
              signalCreated: false,
              emailSent,
              emailFailReason,
            })
            continue
          }

          tradePlanId = insertedTradePlan.id

          const { error: signalStateError } = await supabase
            .from('watchlist')
            .update({ signal_state: 'plan_generated' })
            .eq('id', stock.id)

          if (signalStateError) {
            console.error(
              `[watchlist-evaluate] Failed to set plan_generated for ${stock.ticker}: ${signalStateError.message}`
            )
          }
        } catch (error) {
          console.error(
            `[watchlist-evaluate] Stage 1 unexpected error for ${stock.ticker}: ${error instanceof Error ? error.message : String(error)}`
          )
          stockSummaries.push({
            ticker: stock.ticker,
            verdict: evaluation.verdict,
            signalCreated: false,
            emailSent,
            emailFailReason,
          })
          continue
        }

        if (!plan || !tradePlanId || plan.approval_status !== 'approved') {
          stockSummaries.push({
            ticker: stock.ticker,
            verdict: evaluation.verdict,
            signalCreated: false,
            emailSent,
            emailFailReason,
          })
          continue
        }

        try {
          const existingPendingAction = await getUnresolvedPendingAction({
            userId,
            ticker: stock.ticker,
            actionType: 'buy_signal',
          })

          if (existingPendingAction) {
            stockSummaries.push({
              ticker: stock.ticker,
              verdict: evaluation.verdict,
              signalCreated: false,
              emailSent,
              emailFailReason,
            })
            continue
          }

          const dedupeResult = await checkDedupe({
            userId,
            ticker: stock.ticker,
            triggerType: 'buy_signal',
            triggerState: 'plan_generated',
          })

          if (!dedupeResult.allowed) {
            stockSummaries.push({
              ticker: stock.ticker,
              verdict: evaluation.verdict,
              signalCreated: false,
              emailSent,
              emailFailReason,
            })
            continue
          }

          const expiryDays = settings.buy_signal_expiry_days ?? 1
          const expiresAt = getExpiryDate(expiryDays)

          const pendingActionResult = await createPendingAction({
            userId,
            ticker: stock.ticker,
            actionType: 'buy_signal',
            urgency: 'normal',
            title: `Buy signal: ${stock.ticker}`,
            message: `Setup passed evaluation. Grade: ${stock.setup_grade ?? 'N/A'}. R/R: ${plan.expected_rr}. Entry zone: ${stock.entry_zone_low ?? 'N/A'}–${stock.entry_zone_high ?? 'N/A'}.`,
            watchlistId: stock.id,
            tradePlanId,
            expiresAt,
            payloadJson: {
              verdict: evaluation.verdict,
              score_total: evaluation.score_total,
              setup_grade: stock.setup_grade,
              entry_zone_low: stock.entry_zone_low,
              entry_zone_high: stock.entry_zone_high,
              stop_price: stock.stop_price,
              target_1_price: stock.target_1_price,
              target_2_price: stock.target_2_price,
              expected_rr: plan.expected_rr,
            },
          })

          if (!pendingActionResult.created) {
            console.error(
              `[watchlist-evaluate] Failed to create pending action for ${stock.ticker}: ${pendingActionResult.reason}`
            )
            stockSummaries.push({
              ticker: stock.ticker,
              verdict: evaluation.verdict,
              signalCreated: false,
              emailSent,
              emailFailReason,
            })
            continue
          }

          await recordNotification({
            userId,
            ticker: stock.ticker,
            triggerType: 'buy_signal',
            triggerState: 'plan_generated',
            pendingActionId: pendingActionResult.id,
            cooldownMinutes: 240,
          })

          if (recipientEmail) {
            const emailData = {
              ticker: stock.ticker,
              companyName: stock.company_name ?? undefined,
              setupGrade: stock.setup_grade,
              entryZoneLow: stock.entry_zone_low,
              entryZoneHigh: stock.entry_zone_high,
              stopPrice: stock.stop_price,
              target1Price: stock.target_1_price,
              target2Price: stock.target_2_price ?? undefined,
              shares: plan.final_shares,
              positionValue: plan.final_position_value,
              expectedRR: plan.expected_rr,
              riskPct: plan.risk_pct,
              dollarRisk: plan.dollar_risk,
              marketPhase: market.market_phase ?? 'unknown',
              evaluatedAt: new Date().toISOString(),
              appUrl: edgeConfig.appBaseUrl ?? '',
            }

            const { subject, html } = tradeInstructionCard(emailData)

            const emailResult = await sendEmail(
              { to: recipientEmail, subject, html },
              {
                apiKey: edgeConfig.resendApiKey,
                fromEmail: edgeConfig.resendFromEmail,
              }
            )

            emailSent = emailResult.sent
            emailFailReason = emailResult.sent ? null : emailResult.reason

            if (!emailResult.sent) {
              console.error(
                `[watchlist-evaluate] Email failed for ${stock.ticker}:`,
                emailResult.reason
              )
            }
          } else {
            emailSent = false
            emailFailReason = 'No notification email configured'
            console.error(
              `[watchlist-evaluate] Email failed for ${stock.ticker}: No notification email configured`
            )
          }

          const { error: signalSentError } = await supabase
            .from('watchlist')
            .update({ signal_state: 'signal_sent' })
            .eq('id', stock.id)

          if (signalSentError) {
            console.error(
              `[watchlist-evaluate] Failed to set signal_sent for ${stock.ticker}: ${signalSentError.message}`
            )
          }

          signalsCreated += 1
          stockSummaries.push({
            ticker: stock.ticker,
            verdict: evaluation.verdict,
            signalCreated: true,
            emailSent,
            emailFailReason,
          })
        } catch (error) {
          console.error(
            `[watchlist-evaluate] Stage 2 unexpected error for ${stock.ticker}: ${error instanceof Error ? error.message : String(error)}`
          )
          stockSummaries.push({
            ticker: stock.ticker,
            verdict: evaluation.verdict,
            signalCreated: false,
            emailSent,
            emailFailReason,
          })
        }
      } catch (error) {
        console.error(
          `[watchlist-evaluate] Stock processing failed: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    await safeFinishScanLog({
      logId,
      status: 'completed',
      message: `Watchlist evaluation completed. Processed: ${processed}, pass: ${passCount}, watch: ${watchCount}, fail: ${failCount}, signals: ${signalsCreated}`,
      changesJson: {
        processed,
        passCount,
        watchCount,
        failCount,
        signalsCreated,
        processedTickers,
        stockSummaries,
        windowKey,
        marketHours: isMarketHours(),
      },
    })

    return jsonResponse(
      {
        success: true,
        processed,
        passCount,
        watchCount,
        failCount,
        signalsCreated,
        windowKey,
      },
      200
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unexpected watchlist evaluation error'

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