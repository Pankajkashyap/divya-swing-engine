// Server only — do not import in client components

export type TradeInstructionCardData = {
  ticker: string
  companyName?: string
  setupGrade: string | null
  entryZoneLow: number | null
  entryZoneHigh: number | null
  stopPrice: number | null
  target1Price: number | null
  target2Price?: number | null
  shares: number
  positionValue: number
  expectedRR: number
  riskPct: number
  dollarRisk: number
  marketPhase: string
  evaluatedAt: string
  appUrl?: string
}

function fmtPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `$${value.toFixed(2)}`
}

function fmtMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function fmtRiskPct(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value}%`
}

function fmtEntryZone(low: number | null | undefined, high: number | null | undefined) {
  if (low == null || high == null || !Number.isFinite(low) || !Number.isFinite(high)) {
    return '—'
  }
  return `${fmtPrice(low)} – ${fmtPrice(high)}`
}

function inboxUrl(appUrl?: string) {
  return `${appUrl ?? ''}/inbox`
}

function layout(title: string, body: string) {
  return `
  <div style="background:#fafafa;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#171717;">
    <div style="max-width:600px;margin:0 auto;">
      <div style="background:#ffffff;border:1px solid #e5e5e5;border-radius:8px;padding:32px;">
        ${title}
        ${body}
      </div>
    </div>
  </div>
  `
}

export function tradeInstructionCard(
  data: TradeInstructionCardData
): { subject: string; html: string } {
  const subject = `🟢 Buy Signal: ${data.ticker} — Place limit order before open`
  const url = inboxUrl(data.appUrl)

  const html = layout(
    `
    <div style="font-size:28px;font-weight:700;color:#15803d;">Buy Signal</div>
    <div style="margin-top:10px;font-size:24px;font-weight:700;line-height:1.2;">${data.ticker}</div>
    <div style="margin-top:6px;color:#737373;font-size:14px;">
      ${data.companyName?.trim() ? data.companyName : 'Company name not available'}
    </div>
    `,
    `
    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;">
      <div style="font-size:16px;font-weight:700;color:#15803d;">Next steps</div>
      <div style="margin-top:10px;line-height:1.8;">
        <div><strong>1.</strong> Open Wealthsimple before market open</div>
        <div><strong>2.</strong> Place a buy-stop limit order for ${data.shares} shares of ${data.ticker} with entry zone low as the trigger and entry zone high as the limit</div>
        <div><strong>3.</strong> Confirm the action in the Inbox</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <tr>
        <td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Setup Grade</td>
        <td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.setupGrade ?? '—'}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Entry Zone</td>
        <td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtEntryZone(data.entryZoneLow, data.entryZoneHigh)}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Stop Price</td>
        <td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.stopPrice)}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Target 1</td>
        <td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.target1Price)}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Target 2</td>
        <td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.target2Price ?? null)}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Shares</td>
        <td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.shares}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Position Value</td>
        <td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtMoney(data.positionValue)}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Expected R/R</td>
        <td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.expectedRR.toFixed(2)}:1</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Risk Amount</td>
        <td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtMoney(data.dollarRisk)} (${fmtRiskPct(data.riskPct)} of portfolio)</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#737373;">Market Phase</td>
        <td style="padding:10px 0;text-align:right;font-weight:600;">${data.marketPhase}</td>
      </tr>
    </table>

    <div style="margin-top:18px;color:#737373;font-size:13px;line-height:1.6;">
      This is a pre-market limit order. Place it before 9:30 AM ET. If the stock does not reach the entry zone, the order will not fill — that is correct behaviour.
    </div>

    <div style="margin-top:28px;">
      <a href="${url}" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">
        Confirm in Inbox →
      </a>
    </div>

    <div style="margin-top:24px;color:#737373;font-size:13px;line-height:1.6;">
      Divya Swing Engine · Automated buy signal · All execution is manual in Wealthsimple
    </div>
    `
  )

  return { subject, html }
}