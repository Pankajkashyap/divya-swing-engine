import { getScreenerThresholds } from './screenerThresholds'
import type {
  InvestingSnapshot,
  ScreenerRuleResult,
  ScreenerThresholds,
} from './types'

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '--'
  return `${value.toFixed(1)}%`
}

function formatRatio(value: number | null | undefined, suffix = '') {
  if (value == null || !Number.isFinite(value)) return '--'
  return `${value.toFixed(2)}${suffix}`
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '--'
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  return `$${value.toFixed(0)}`
}

function evaluateMinRule(args: {
  id: string
  label: string
  metric: string
  actual: number | null
  threshold: number | null
  actualFormatter?: (value: number | null) => string
  thresholdFormatter?: (value: number | null) => string
}): ScreenerRuleResult {
  const {
    id,
    label,
    metric,
    actual,
    threshold,
    actualFormatter = formatRatio,
    thresholdFormatter = formatRatio,
  } = args

  if (threshold == null) {
    return {
      id,
      label,
      metric,
      thresholdText: 'Not used for this sector',
      actualValueText: actualFormatter(actual),
      status: 'inconclusive',
      explanation: `${label} is not used for this sector.`,
    }
  }

  if (actual == null || !Number.isFinite(actual)) {
    return {
      id,
      label,
      metric,
      thresholdText: `>= ${thresholdFormatter(threshold)}`,
      actualValueText: '--',
      status: 'inconclusive',
      explanation: `${label} could not be evaluated because data is missing.`,
    }
  }

  const passed = actual >= threshold

  return {
    id,
    label,
    metric,
    thresholdText: `>= ${thresholdFormatter(threshold)}`,
    actualValueText: actualFormatter(actual),
    status: passed ? 'pass' : 'fail',
    explanation: passed
      ? `${label} passed.`
      : `${label} failed because ${actualFormatter(actual)} is below ${thresholdFormatter(threshold)}.`,
  }
}

function evaluateMaxRule(args: {
  id: string
  label: string
  metric: string
  actual: number | null
  threshold: number | null
  actualFormatter?: (value: number | null) => string
  thresholdFormatter?: (value: number | null) => string
}): ScreenerRuleResult {
  const {
    id,
    label,
    metric,
    actual,
    threshold,
    actualFormatter = formatRatio,
    thresholdFormatter = formatRatio,
  } = args

  if (threshold == null) {
    return {
      id,
      label,
      metric,
      thresholdText: 'Not used for this sector',
      actualValueText: actualFormatter(actual),
      status: 'inconclusive',
      explanation: `${label} is not used for this sector.`,
    }
  }

  if (actual == null || !Number.isFinite(actual)) {
    return {
      id,
      label,
      metric,
      thresholdText: `<= ${thresholdFormatter(threshold)}`,
      actualValueText: '--',
      status: 'inconclusive',
      explanation: `${label} could not be evaluated because data is missing.`,
    }
  }

  const passed = actual <= threshold

  return {
    id,
    label,
    metric,
    thresholdText: `<= ${thresholdFormatter(threshold)}`,
    actualValueText: actualFormatter(actual),
    status: passed ? 'pass' : 'fail',
    explanation: passed
      ? `${label} passed.`
      : `${label} failed because ${actualFormatter(actual)} is above ${thresholdFormatter(threshold)}.`,
  }
}

function evaluateBooleanRequiredRule(args: {
  id: string
  label: string
  metric: string
  actual: boolean | null
  required: boolean
  explanationWhenMissing: string
  explanationWhenFailed: string
}): ScreenerRuleResult {
  const { id, label, metric, actual, required, explanationWhenMissing, explanationWhenFailed } =
    args

  if (actual == null) {
    return {
      id,
      label,
      metric,
      thresholdText: required ? 'Required' : 'Optional',
      actualValueText: '--',
      status: 'inconclusive',
      explanation: explanationWhenMissing,
    }
  }

  const passed = required ? actual === true : true

  return {
    id,
    label,
    metric,
    thresholdText: required ? 'Required' : 'Optional',
    actualValueText: actual ? 'Yes' : 'No',
    status: passed ? 'pass' : 'fail',
    explanation: passed ? `${label} passed.` : explanationWhenFailed,
  }
}

export function runScreener(snapshot: InvestingSnapshot): {
  thresholds: ScreenerThresholds
  rules: ScreenerRuleResult[]
} {
  const thresholds = getScreenerThresholds(snapshot.sector)

  const rules: ScreenerRuleResult[] = [
    evaluateMinRule({
      id: 'SCR-UNI-01',
      label: 'Market cap',
      metric: 'marketCap',
      actual: snapshot.marketCap,
      threshold: thresholds.marketCapMin,
      actualFormatter: formatCurrency,
      thresholdFormatter: formatCurrency,
    }),

    evaluateMinRule({
      id: 'SCR-UNI-02',
      label: 'Positive earnings history',
      metric: 'yearsPositiveEarnings',
      actual: snapshot.yearsPositiveEarnings,
      threshold: thresholds.yearsPositiveEarningsMin,
      actualFormatter: (value) => (value == null ? '--' : `${value.toFixed(0)} years`),
      thresholdFormatter: (value) => (value == null ? '--' : `${value.toFixed(0)} years`),
    }),

    evaluateBooleanRequiredRule({
      id: 'SCR-UNI-03',
      label: 'US listing',
      metric: 'isUsListed',
      actual: snapshot.isUsListed,
      required: thresholds.requiresUsListing,
      explanationWhenMissing: 'US listing could not be confirmed.',
      explanationWhenFailed: 'Company failed because it is not identified as US-listed.',
    }),

    evaluateMinRule({
      id: 'SCR-PROF-01',
      label: 'ROIC (TTM)',
      metric: 'roicTtm',
      actual: snapshot.roicTtm,
      threshold: thresholds.roicTtmMin,
      actualFormatter: formatPercent,
      thresholdFormatter: formatPercent,
    }),

    evaluateMinRule({
      id: 'SCR-PROF-02',
      label: 'ROIC (5Y Avg)',
      metric: 'roic5yAvg',
      actual: snapshot.roic5yAvg,
      threshold: thresholds.roic5yAvgMin,
      actualFormatter: formatPercent,
      thresholdFormatter: formatPercent,
    }),

    evaluateMinRule({
      id: 'SCR-PROF-03',
      label: 'ROE',
      metric: 'roeTtm',
      actual: snapshot.roeTtm,
      threshold: thresholds.roeTtmMin,
      actualFormatter: formatPercent,
      thresholdFormatter: formatPercent,
    }),

    evaluateMinRule({
      id: 'SCR-PROF-04',
      label: 'Gross margin',
      metric: 'grossMarginTtm',
      actual: snapshot.grossMarginTtm,
      threshold: thresholds.grossMarginMin,
      actualFormatter: formatPercent,
      thresholdFormatter: formatPercent,
    }),

    evaluateMinRule({
      id: 'SCR-PROF-05',
      label: 'Operating margin',
      metric: 'operatingMarginTtm',
      actual: snapshot.operatingMarginTtm,
      threshold: thresholds.operatingMarginMin,
      actualFormatter: formatPercent,
      thresholdFormatter: formatPercent,
    }),

    evaluateMinRule({
      id: 'SCR-PROF-06',
      label: 'FCF margin',
      metric: 'fcfMarginTtm',
      actual: snapshot.fcfMarginTtm,
      threshold: thresholds.fcfMarginMin,
      actualFormatter: formatPercent,
      thresholdFormatter: formatPercent,
    }),

    evaluateMaxRule({
      id: 'SCR-VAL-01',
      label: 'EV / EBIT',
      metric: 'evToEbitTtm',
      actual: snapshot.evToEbitTtm,
      threshold: thresholds.evToEbitMax,
      actualFormatter: (value) => formatRatio(value, 'x'),
      thresholdFormatter: (value) => formatRatio(value, 'x'),
    }),

    evaluateMinRule({
      id: 'SCR-VAL-02',
      label: 'Earnings yield',
      metric: 'earningsYieldTtm',
      actual: snapshot.earningsYieldTtm,
      threshold: thresholds.earningsYieldMin,
      actualFormatter: formatPercent,
      thresholdFormatter: formatPercent,
    }),

    evaluateMaxRule({
      id: 'SCR-VAL-03',
      label: 'Forward P/E',
      metric: 'forwardPe',
      actual: snapshot.forwardPe,
      threshold: thresholds.forwardPeMax,
      actualFormatter: (value) => formatRatio(value, 'x'),
      thresholdFormatter: (value) => formatRatio(value, 'x'),
    }),

    evaluateMaxRule({
      id: 'SCR-VAL-04',
      label: 'PEG ratio',
      metric: 'pegRatio',
      actual: snapshot.pegRatio,
      threshold: thresholds.pegRatioMax,
    }),

    evaluateMaxRule({
      id: 'SCR-VAL-05',
      label: 'Price / FCF',
      metric: 'priceToFcfTtm',
      actual: snapshot.priceToFcfTtm,
      threshold: thresholds.priceToFcfMax,
      actualFormatter: (value) => formatRatio(value, 'x'),
      thresholdFormatter: (value) => formatRatio(value, 'x'),
    }),

    evaluateMaxRule({
      id: 'SCR-VAL-06',
      label: 'Price / Book',
      metric: 'priceToBook',
      actual: snapshot.priceToBook,
      threshold: thresholds.priceToBookMax,
      actualFormatter: (value) => formatRatio(value, 'x'),
      thresholdFormatter: (value) => formatRatio(value, 'x'),
    }),

    evaluateMaxRule({
      id: 'SCR-FH-01',
      label: 'Debt / Equity',
      metric: 'debtToEquity',
      actual: snapshot.debtToEquity,
      threshold: thresholds.debtToEquityMax,
    }),

    evaluateMaxRule({
      id: 'SCR-FH-02',
      label: 'Net Debt / EBITDA',
      metric: 'netDebtToEbitda',
      actual: snapshot.netDebtToEbitda,
      threshold: thresholds.netDebtToEbitdaMax,
      actualFormatter: (value) => formatRatio(value, 'x'),
      thresholdFormatter: (value) => formatRatio(value, 'x'),
    }),

    evaluateMinRule({
      id: 'SCR-FH-03',
      label: 'Interest coverage',
      metric: 'interestCoverage',
      actual: snapshot.interestCoverage,
      threshold: thresholds.interestCoverageMin,
      actualFormatter: (value) => formatRatio(value, 'x'),
      thresholdFormatter: (value) => formatRatio(value, 'x'),
    }),

    evaluateMinRule({
      id: 'SCR-FH-04',
      label: 'Current ratio',
      metric: 'currentRatio',
      actual: snapshot.currentRatio,
      threshold: thresholds.currentRatioMin,
    }),

    evaluateBooleanRequiredRule({
      id: 'SCR-FH-05',
      label: 'Positive free cash flow',
      metric: 'freeCashFlowTtm',
      actual: snapshot.freeCashFlowTtm == null ? null : snapshot.freeCashFlowTtm > 0,
      required: thresholds.freeCashFlowPositiveRequired,
      explanationWhenMissing: 'Free cash flow could not be evaluated.',
      explanationWhenFailed: 'Company failed because trailing free cash flow is not positive.',
    }),

    evaluateMinRule({
      id: 'SCR-GR-01',
      label: 'Revenue growth (3Y CAGR)',
      metric: 'revenueGrowth3yCagr',
      actual: snapshot.revenueGrowth3yCagr,
      threshold: thresholds.revenueGrowth3yCagrMin,
      actualFormatter: formatPercent,
      thresholdFormatter: formatPercent,
    }),

    evaluateMinRule({
      id: 'SCR-GR-02',
      label: 'EPS growth (3Y CAGR)',
      metric: 'epsGrowth3yCagr',
      actual: snapshot.epsGrowth3yCagr,
      threshold: thresholds.epsGrowth3yCagrMin,
      actualFormatter: formatPercent,
      thresholdFormatter: formatPercent,
    }),

    evaluateMinRule({
      id: 'SCR-GR-03',
      label: 'FCF growth (3Y CAGR)',
      metric: 'fcfGrowth3yCagr',
      actual: snapshot.fcfGrowth3yCagr,
      threshold: thresholds.fcfGrowth3yCagrMin,
      actualFormatter: formatPercent,
      thresholdFormatter: formatPercent,
    }),
  ]

  return { thresholds, rules }
}