import { buildInvestingSnapshot } from './buildSnapshot'
import { loadVerdictConfig } from './loadVerdictConfig'
import { runRedFlags } from './runRedFlags'
import { runQuantitativeScorecard } from './runScorecard'
import { runScreener } from './runScreener'
import { runVerdict } from './runVerdict'
import type { ScreenerEngineResult } from './types'

export async function evaluateTicker(ticker: string): Promise<ScreenerEngineResult> {
  
  const snapshot = await buildInvestingSnapshot(ticker)


  const { thresholds, rules } = runScreener(snapshot)
  const redFlags = runRedFlags(snapshot)
  const scorecard = runQuantitativeScorecard(rules)
  const verdictConfig = await loadVerdictConfig()
  const verdict = runVerdict({ scorecard, redFlags, config: verdictConfig })

  const passedRules = rules.filter((rule) => rule.status === 'pass').length
  const failedRules = rules.filter((rule) => rule.status === 'fail').length
  const inconclusiveRules = rules.filter((rule) => rule.status === 'inconclusive').length
  const criticalRedFlags = redFlags.filter(
    (flag) => flag.triggered && flag.severity === 'critical'
  ).length

  const passedInitialScreen = failedRules === 0 && criticalRedFlags === 0

  return {
    snapshot,
    thresholds,
    rules,
    redFlags,
    passedRules,
    failedRules,
    inconclusiveRules,
    criticalRedFlags,
    passedInitialScreen,
    scorecard,
    verdict,
    valuationDebug: snapshot.fairValueDebug
  ? {
      ...snapshot.fairValueDebug,
      range: {
        fairValueLow: snapshot.fairValueLow,
        fairValueBase: snapshot.fairValueBase,
        fairValueHigh: snapshot.fairValueHigh,
        validMethodCount: snapshot.fairValueValidMethodCount ?? 0,
      },
    }
  : undefined,
  }
}