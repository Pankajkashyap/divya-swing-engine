import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { investingDigest } from '@/app/investing/lib/email/investingDigest'
import {
  runAllSellSignals,
  type SellSignalInput,
} from '@/app/investing/lib/sellSignals'
import type {
  BucketTarget,
  DecisionJournalEntry,
  Holding,
  SectorTarget,
  StockAnalysis,
  WatchlistItem,
} from '@/app/investing/types'

type DigestRebalanceAlert = {
  name: string
  status: string
  currentPct: number
  suggestion: string
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipientEmail = process.env.AUTHORIZED_EMAIL || user.email
    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No recipient email configured' },
        { status: 500 }
      )
    }

    const [
      holdingsRes,
      watchlistRes,
      analysesRes,
      journalRes,
      sectorTargetsRes,
      bucketTargetsRes,
    ] = await Promise.all([
      supabase.from('investing_holdings').select('*').eq('user_id', user.id),
      supabase.from('investing_watchlist').select('*').eq('user_id', user.id),
      supabase.from('investing_stock_analyses').select('*').eq('user_id', user.id),
      supabase
        .from('investing_decision_journal')
        .select('*')
        .eq('user_id', user.id),
      supabase.from('investing_sector_targets').select('*'),
      supabase.from('investing_bucket_targets').select('*'),
    ])

    if (holdingsRes.error) {
      return NextResponse.json({ error: holdingsRes.error.message }, { status: 500 })
    }
    if (watchlistRes.error) {
      return NextResponse.json({ error: watchlistRes.error.message }, { status: 500 })
    }
    if (analysesRes.error) {
      return NextResponse.json({ error: analysesRes.error.message }, { status: 500 })
    }
    if (journalRes.error) {
      return NextResponse.json({ error: journalRes.error.message }, { status: 500 })
    }
    if (sectorTargetsRes.error) {
      return NextResponse.json(
        { error: sectorTargetsRes.error.message },
        { status: 500 }
      )
    }
    if (bucketTargetsRes.error) {
      return NextResponse.json(
        { error: bucketTargetsRes.error.message },
        { status: 500 }
      )
    }

    const holdings = (holdingsRes.data ?? []) as Holding[]
    const watchlistItems = (watchlistRes.data ?? []) as WatchlistItem[]
    const analyses = (analysesRes.data ?? []) as StockAnalysis[]
    const journalEntries = (journalRes.data ?? []) as DecisionJournalEntry[]
    const sectorTargets = (sectorTargetsRes.data ?? []) as SectorTarget[]
    const bucketTargets = (bucketTargetsRes.data ?? []) as BucketTarget[]

    const totalPortfolioValue = holdings.reduce(
      (sum, h) => sum + Number(h.market_value ?? 0),
      0
    )

    const equityHoldings = holdings.filter(
      (h) => h.bucket !== 'TFSA Cash' && h.bucket !== 'Non-registered Cash'
    )

    const equityValue = equityHoldings.reduce(
      (sum, h) => sum + Number(h.market_value ?? 0),
      0
    )

    const cashValue = holdings
      .filter(
        (h) => h.bucket === 'TFSA Cash' || h.bucket === 'Non-registered Cash'
      )
      .reduce((sum, h) => sum + Number(h.market_value ?? 0), 0)

    const cashPct =
      totalPortfolioValue > 0 ? (cashValue / totalPortfolioValue) * 100 : 0

    const weightedGainLossPct =
      equityValue > 0
        ? equityHoldings.reduce((sum, h) => {
            const mv = Number(h.market_value ?? 0)
            const glp = Number(h.gain_loss_pct ?? 0)
            return sum + (mv / equityValue) * glp
          }, 0)
        : 0

    const readyToBuyItems = watchlistItems
      .filter((w) => w.status === 'Ready to buy')
      .map((w) => ({
        ticker: w.ticker,
        company: w.company,
        currentPrice: w.current_price,
        targetEntry: w.target_entry,
      }))

    const approachingEntryItems = watchlistItems
      .filter((w) => w.status === 'Watching — approaching entry')
      .map((w) => ({
        ticker: w.ticker,
        company: w.company,
        currentPrice: w.current_price,
        targetEntry: w.target_entry,
      }))

    const sectorTotals = new Map<string, number>()
    const bucketTotals = new Map<string, number>()

    for (const h of equityHoldings) {
      const sector = h.sector || 'Unassigned'
      sectorTotals.set(sector, (sectorTotals.get(sector) ?? 0) + Number(h.market_value ?? 0))

      const bucket = h.bucket || 'Unassigned'
      bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + Number(h.market_value ?? 0))
    }

    const sellSignalInputs: SellSignalInput[] = equityHoldings.map((h) => {
      const latestAnalysis = analyses.find(
        (a) => a.ticker?.toUpperCase() === h.ticker?.toUpperCase()
      )
      const sectorTarget = sectorTargets.find((t) => t.sector === h.sector)
      const bucketTarget = bucketTargets.find((t) => t.bucket === h.bucket)
      const mv = Number(h.market_value ?? 0)

      return {
        ticker: h.ticker,
        company: h.company,
        shares: h.shares,
        avgCost: h.avg_cost,
        currentPrice: h.current_price,
        marketValue: h.market_value,
        gainLossPct: h.gain_loss_pct,
        sector: h.sector || 'Unassigned',
        bucket: h.bucket,
        thesisStatus: h.thesis_status,
        latestVerdict: latestAnalysis?.verdict ?? latestAnalysis?.verdict_auto ?? null,
        latestConfidence:
          latestAnalysis?.confidence ?? latestAnalysis?.confidence_auto ?? null,
        fairValueLow: latestAnalysis?.fair_value_low ?? null,
        fairValueHigh: latestAnalysis?.fair_value_high ?? null,
        positionWeightPct:
          totalPortfolioValue > 0 ? (mv / totalPortfolioValue) * 100 : 0,
        sectorWeightPct:
          totalPortfolioValue > 0
            ? ((sectorTotals.get(h.sector || 'Unassigned') ?? 0) / totalPortfolioValue) *
              100
            : 0,
        sectorTargetMaxPct: sectorTarget?.max_pct ?? null,
        bucketWeightPct:
          totalPortfolioValue > 0
            ? ((bucketTotals.get(h.bucket || 'Unassigned') ?? 0) / totalPortfolioValue) *
              100
            : 0,
        bucketTargetMaxPct: bucketTarget?.max_pct ?? null,
      }
    })

    const allSellSignals = runAllSellSignals(sellSignalInputs)

    const criticalSignals = allSellSignals
      .filter((s) => s.severity === 'critical')
      .map((s) => ({
        ticker: s.ticker,
        title: s.title,
        explanation: s.explanation,
      }))

    const warningSignals = allSellSignals
      .filter((s) => s.severity === 'warning')
      .map((s) => ({
        ticker: s.ticker,
        title: s.title,
        explanation: s.explanation,
      }))

    const today = new Date().toISOString().slice(0, 10)

    const overdue3mCount = journalEntries.filter(
      (e) => e.review_due_3m && e.review_due_3m <= today && !e.three_month_review
    ).length

    const overdue12mCount = journalEntries.filter(
      (e) => e.review_due_12m && e.review_due_12m <= today && !e.twelve_month_review
    ).length

    const rebalanceAlerts: DigestRebalanceAlert[] = []

    for (const st of sectorTargets) {
      const sectorValue = sectorTotals.get(st.sector) ?? 0
      const pct = totalPortfolioValue > 0 ? (sectorValue / totalPortfolioValue) * 100 : 0

      if (st.max_pct != null && pct > st.max_pct) {
        rebalanceAlerts.push({
          name: st.sector,
          status: 'Overweight',
          currentPct: pct,
          suggestion: `Trim to reach ${st.max_pct}% max`,
        })
      }

      if (st.min_pct != null && pct < st.min_pct && pct > 0) {
        rebalanceAlerts.push({
          name: st.sector,
          status: 'Underweight',
          currentPct: pct,
          suggestion: `Add to reach ${st.min_pct}% min`,
        })
      }
    }

    if (cashPct < 5 && totalPortfolioValue > 0) {
      rebalanceAlerts.push({
        name: 'Cash reserves',
        status: 'Low',
        currentPct: cashPct,
        suggestion: 'Add cash to reach 5% minimum',
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
    const { subject, html } = investingDigest({
      date: today,
      totalPortfolioValue,
      totalGainLossPct: weightedGainLossPct,
      holdingsCount: equityHoldings.length,
      cashPct,
      readyToBuyItems,
      approachingEntryItems,
      criticalSignals,
      warningSignals,
      rebalanceAlerts,
      overdue3mCount,
      overdue12mCount,
      appUrl,
      pricesUpdated: equityHoldings.length,
    })

    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html,
    })

    if (!result.sent) {
      return NextResponse.json(
        { error: `Email failed: ${result.reason}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Digest sent successfully.',
      emailId: result.id,
      to: recipientEmail,
      criticalSignals: criticalSignals.length,
      warningSignals: warningSignals.length,
      readyToBuy: readyToBuyItems.length,
      rebalanceAlerts: rebalanceAlerts.length,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to send digest.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}