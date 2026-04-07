// Server only — do not import in client components

import { edgeConfig } from '../../config.ts'

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

function fmtMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function fmtPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `$${value.toFixed(2)}`
}

function fmtPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(2)}%`
}

function fmtDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function inboxUrl(appUrl?: string) {
  return `${appUrl ?? edgeConfig.appBaseUrl ?? ''}/inbox`
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

export function tradeInstructionCard(data: TradeInstructionCardData): {
  subject: string
  html: string
} {
  const subject = `🟢 Buy Signal: ${data.ticker} — Grade ${data.setupGrade ?? 'N/A'}`
  const url = inboxUrl(data.appUrl)

  const html = layout(
    `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
      <div>
        <div style="font-size:32px;font-weight:700;line-height:1.1;">${data.ticker}</div>
        ${
          data.companyName
            ? `<div style="margin-top:6px;color:#737373;font-size:14px;">${data.companyName}</div>`
            : ''
        }
      </div>
      <div style="background:#16a34a;color:#ffffff;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;">
        Grade ${data.setupGrade ?? 'N/A'}
      </div>
    </div>
    `,
    `
    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#f5f5f5;border:1px solid #e5e5e5;">
      <div style="font-size:16px;font-weight:700;">Place a limit buy order in Wealthsimple</div>
      <div style="margin-top:8px;color:#737373;font-size:14px;">Order type: Limit (not market)</div>
      <div style="margin-top:4px;color:#737373;font-size:14px;">Valid until: End of trading day — if not filled, reassess tomorrow</div>
      <div style="margin-top:4px;color:#737373;font-size:14px;">Reviewed on ${fmtDate(data.evaluatedAt)}</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Entry zone</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.entryZoneLow)} – ${fmtPrice(data.entryZoneHigh)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Stop price</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.stopPrice)}<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#737373;font-weight:400;">Exit immediately if price closes below this</div></td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Target 1</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.target1Price)}</td></tr>
      ${
        data.target2Price != null
          ? `<tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Target 2</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.target2Price)}</td></tr>`
          : ''
      }
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Shares</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.shares}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Position value</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtMoney(data.positionValue)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Expected R/R</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.expectedRR.toFixed(2)}x</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Risk %</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPercent(data.riskPct)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;">Dollar risk</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;">${fmtMoney(data.dollarRisk)}</td></tr>
    </table>

    <div style="margin-top:24px;font-size:14px;">
      <span style="color:#737373;">Market phase:</span>
      <span style="margin-left:8px;font-weight:600;">${data.marketPhase}</span>
    </div>

    <div style="margin-top:24px;color:#737373;font-size:13px;line-height:1.8;">
      <div>□ Confirm market phase is still ${data.marketPhase}</div>
      <div>□ Confirm entry price is within the entry zone</div>
      <div>□ Confirm position size matches the shares above</div>
      <div>□ Set the stop in Wealthsimple at ${fmtPrice(data.stopPrice)}</div>
      <div>□ Note Target 1 for partial exit planning</div>
    </div>

    <div style="margin-top:16px;color:#737373;font-size:13px;line-height:1.6;">
      This signal expires after market close today. If unfilled, it will be automatically dismissed
      from the Inbox.
    </div>

    <div style="margin-top:28px;">
      <a href="${url}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">
        Confirm in Inbox →
      </a>
    </div>

    <div style="margin-top:24px;color:#737373;font-size:13px;line-height:1.6;">
      Generated by Divya Swing Engine based on Mark Minervini's SEPA® methodology.
      All execution is manual — this is not financial advice.
    </div>
    `
  )

  return { subject, html }
}