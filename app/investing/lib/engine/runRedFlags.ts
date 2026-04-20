import type { InvestingSnapshot, RedFlagResult } from './types'


export function runRedFlags(snapshot: InvestingSnapshot): RedFlagResult[] {
  return [
    {
      id: 'RF-01',
      label: 'Negative free cash flow for 2+ consecutive years',
      triggered: snapshot.negativeFcfYearsLast2 === true,
      severity: 'critical',
      explanation:
        snapshot.negativeFcfYearsLast2 == null
          ? 'Free cash flow history is incomplete.'
          : snapshot.negativeFcfYearsLast2
            ? 'Company has negative free cash flow in the last two reported years.'
            : 'Free cash flow did not show two consecutive negative years.',
    },

    {
      id: 'RF-02',
      label: 'ROIC consistently below 8%',
      triggered:
        snapshot.roicTtm != null &&
        snapshot.roic5yAvg != null &&
        snapshot.roicTtm < 8 &&
        snapshot.roic5yAvg < 8,
      severity: 'critical',
      explanation:
        snapshot.roicTtm == null || snapshot.roic5yAvg == null
          ? 'ROIC data is incomplete.'
          : snapshot.roicTtm < 8 && snapshot.roic5yAvg < 8
            ? 'Both trailing and multi-year ROIC are below 8%.'
            : 'ROIC does not indicate persistent value destruction at this threshold.',
    },

    {
      id: 'RF-03',
      label: 'Net Debt / EBITDA above 5x',
      triggered:
        snapshot.netDebtToEbitda != null && snapshot.netDebtToEbitda > 5,
      severity: 'critical',
      explanation:
        snapshot.netDebtToEbitda == null
          ? 'Net Debt / EBITDA data is unavailable.'
          : snapshot.netDebtToEbitda > 5
            ? `Net Debt / EBITDA is ${snapshot.netDebtToEbitda.toFixed(2)}x, above 5x.`
            : 'Leverage is below the 5x danger threshold.',
    },

    {
      id: 'RF-04',
      label: 'Interest coverage below 2x',
      triggered:
        snapshot.interestCoverage != null && snapshot.interestCoverage < 2,
      severity: 'critical',
      explanation:
        snapshot.interestCoverage == null
          ? 'Interest coverage data is unavailable.'
          : snapshot.interestCoverage < 2
            ? `Interest coverage is ${snapshot.interestCoverage.toFixed(2)}x, below 2x.`
            : 'Interest coverage remains above the distress threshold.',
    },

    {
      id: 'RF-05',
      label: 'Declining revenue for 3+ consecutive years',
      triggered: snapshot.revenueTrend3yDeclining === true,
      severity: 'warning',
      explanation:
        snapshot.revenueTrend3yDeclining == null
          ? 'Revenue trend data is incomplete.'
          : snapshot.revenueTrend3yDeclining
            ? 'Revenue has declined in each of the last three reported years.'
            : 'Revenue does not show a three-year declining pattern.',
    },

    {
      id: 'RF-06',
      label: 'FCF conversion below 50%',
      triggered:
        snapshot.fcfConversion3yAvg != null && snapshot.fcfConversion3yAvg < 50,
      severity: 'warning',
      explanation:
        snapshot.fcfConversion3yAvg == null
          ? 'FCF conversion data is unavailable.'
          : snapshot.fcfConversion3yAvg < 50
            ? `Average FCF conversion is ${snapshot.fcfConversion3yAvg.toFixed(1)}%, below 50%.`
            : 'FCF conversion remains above the warning threshold.',
    },

    {
      id: 'RF-07',
      label: 'Goodwill / intangibles heavy balance sheet',
      triggered:
        snapshot.goodwillToAssets != null && snapshot.goodwillToAssets > 50,
      severity: 'warning',
      explanation:
        snapshot.goodwillToAssets == null
          ? 'Goodwill-to-assets data is unavailable.'
          : snapshot.goodwillToAssets > 50
            ? `Goodwill and intangibles are ${snapshot.goodwillToAssets.toFixed(1)}% of total assets.`
            : 'Goodwill / intangible balance does not breach the warning threshold.',
    },

    {
      id: 'RF-08',
      label: 'Operating margin deterioration over 3 years',
      triggered: snapshot.marginDeterioration3y === true,
      severity: 'warning',
      explanation:
        snapshot.marginDeterioration3y == null
          ? 'Margin trend data is incomplete.'
          : snapshot.marginDeterioration3y
            ? 'Operating margin has deteriorated over the last three reported years.'
            : 'Operating margin does not show a persistent deterioration pattern.',
    },
  ]
}