export type InvestingDigestData = {
  date: string
  totalPortfolioValue: number
  totalGainLossPct: number
  holdingsCount: number
  cashPct: number
  readyToBuyItems: Array<{
    ticker: string
    company: string
    currentPrice: number
    targetEntry: number | null
  }>
  approachingEntryItems: Array<{
    ticker: string
    company: string
    currentPrice: number
    targetEntry: number | null
  }>
  criticalSignals: Array<{
    ticker: string
    title: string
    explanation: string
  }>
  warningSignals: Array<{
    ticker: string
    title: string
    explanation: string
  }>
  rebalanceAlerts: Array<{
    name: string
    status: string
    currentPct: number
    suggestion: string
  }>
  overdue3mCount: number
  overdue12mCount: number
  appUrl: string
  pricesUpdated: number
}

function fmtMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function fmtPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function layout(title: string, body: string): string {
  return `
  <div style="background:#0f1117;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e6eaf0;">
    <div style="max-width:600px;margin:0 auto;">
      <div style="background:#1a1f2b;border:1px solid #2a313b;border-radius:8px;padding:32px;">
        <div style="font-size:20px;font-weight:700;margin-bottom:4px;">${title}</div>
        ${body}
      </div>
      <div style="text-align:center;margin-top:16px;font-size:12px;color:#6b7280;">
        Shayna Investment App — Automated digest
      </div>
    </div>
  </div>`
}

function section(title: string, content: string): string {
  return `
  <div style="margin-top:24px;">
    <div style="font-size:14px;font-weight:600;color:#a8b2bf;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${title}</div>
    ${content}
  </div>`
}

function alertRow(color: string, ticker: string, text: string): string {
  return `
  <div style="padding:8px 12px;margin-bottom:4px;border-left:3px solid ${color};background:#222830;border-radius:4px;">
    <span style="font-weight:600;">${ticker}</span>
    <span style="color:#a8b2bf;font-size:13px;"> — ${text}</span>
  </div>`
}

export function investingDigest(
  data: InvestingDigestData
): { subject: string; html: string } {
  const hasAlerts =
    data.readyToBuyItems.length > 0 ||
    data.criticalSignals.length > 0 ||
    data.warningSignals.length > 0 ||
    data.rebalanceAlerts.length > 0 ||
    data.overdue3mCount > 0 ||
    data.overdue12mCount > 0

  const subjectParts: string[] = []
  if (data.criticalSignals.length > 0) {
    subjectParts.push(`${data.criticalSignals.length} critical`)
  }
  if (data.readyToBuyItems.length > 0) {
    subjectParts.push(`${data.readyToBuyItems.length} ready to buy`)
  }
  if (data.warningSignals.length > 0) {
    subjectParts.push(`${data.warningSignals.length} warnings`)
  }

  const subject =
    subjectParts.length > 0
      ? `Shayna Digest: ${subjectParts.join(', ')}`
      : `Shayna Digest: Portfolio at ${fmtMoney(data.totalPortfolioValue)}`

  let body = ''

  body += section(
    'Portfolio Snapshot',
    `
    <div style="background:#222830;border-radius:6px;padding:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="color:#a8b2bf;">Total Value</span>
        <span style="font-weight:600;">${fmtMoney(data.totalPortfolioValue)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="color:#a8b2bf;">Gain/Loss</span>
        <span style="font-weight:600;color:${data.totalGainLossPct >= 0 ? '#22c55e' : '#ef4444'};">${fmtPct(data.totalGainLossPct)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="color:#a8b2bf;">Holdings</span>
        <span>${data.holdingsCount}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#a8b2bf;">Cash</span>
        <span style="color:${data.cashPct < 5 ? '#ef4444' : '#a8b2bf'};">${data.cashPct.toFixed(1)}%</span>
      </div>
    </div>
  `
  )

  if (data.criticalSignals.length > 0) {
    const rows = data.criticalSignals
      .map((s) => alertRow('#ef4444', s.ticker, s.title))
      .join('')
    body += section(`Critical Signals (${data.criticalSignals.length})`, rows)
  }

  if (data.readyToBuyItems.length > 0) {
    const rows = data.readyToBuyItems
      .map((item) => {
        const targetText =
          item.targetEntry != null ? ` (target: $${item.targetEntry.toFixed(2)})` : ''
        return alertRow(
          '#22c55e',
          item.ticker,
          `Ready to buy at $${item.currentPrice.toFixed(2)}${targetText}`
        )
      })
      .join('')
    body += section(`Ready to Buy (${data.readyToBuyItems.length})`, rows)
  }

  if (data.approachingEntryItems.length > 0) {
    const rows = data.approachingEntryItems
      .map((item) =>
        alertRow(
          '#3b82f6',
          item.ticker,
          `Approaching entry at $${item.currentPrice.toFixed(2)}`
        )
      )
      .join('')
    body += section(`Approaching Entry (${data.approachingEntryItems.length})`, rows)
  }

  if (data.warningSignals.length > 0) {
    const rows = data.warningSignals
      .map((s) => alertRow('#eab308', s.ticker, s.title))
      .join('')
    body += section(`Warning Signals (${data.warningSignals.length})`, rows)
  }

  if (data.rebalanceAlerts.length > 0) {
    const rows = data.rebalanceAlerts
      .map((a) =>
        alertRow(
          '#a855f7',
          a.name,
          `${a.status} at ${a.currentPct.toFixed(1)}% — ${a.suggestion}`
        )
      )
      .join('')
    body += section(`Rebalancing (${data.rebalanceAlerts.length})`, rows)
  }

  if (data.overdue3mCount > 0 || data.overdue12mCount > 0) {
    let reviewText = ''
    if (data.overdue3mCount > 0) {
      reviewText += `<div>${data.overdue3mCount} overdue 3-month review(s)</div>`
    }
    if (data.overdue12mCount > 0) {
      reviewText += `<div>${data.overdue12mCount} overdue 12-month review(s)</div>`
    }
    body += section(
      'Overdue Reviews',
      `<div style="background:#222830;border-radius:6px;padding:12px;color:#eab308;">${reviewText}</div>`
    )
  }

  if (!hasAlerts) {
    body += section(
      'Status',
      '<div style="color:#22c55e;">All clear — no actionable alerts today.</div>'
    )
  }

  body += `
  <div style="margin-top:24px;text-align:center;">
    <a href="${data.appUrl}/investing" style="display:inline-block;padding:10px 24px;background:#6366f1;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
      Open Dashboard
    </a>
  </div>`

  return { subject, html: layout(`Shayna Digest — ${data.date}`, body) }
}