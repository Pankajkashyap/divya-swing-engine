import { APP_BASE_URL } from '@/lib/config'

export type TargetAlertData = {
  ticker: string
  currentPrice: number
  targetPrice: number
  targetNumber: 1 | 2
  entryPrice: number
  sharesHeld: number
  estimatedGain: number
  estimatedGainPct: number
  tradeId: string
  appUrl?: string
}

function fmtMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function fmtPrice(value: number) {
  return `$${value.toFixed(2)}`
}

function fmtPercent(value: number) {
  return `${value.toFixed(2)}%`
}

function inboxUrl(appUrl?: string) {
  return `${appUrl ?? APP_BASE_URL}/inbox`
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

export function targetAlert(data: TargetAlertData): {
  subject: string
  html: string
} {
  const subject = `🟡 Target ${data.targetNumber} Hit: ${data.ticker} at ${fmtPrice(data.currentPrice)}`
  const url = inboxUrl(data.appUrl)

  const html = layout(
    `
    <div style="font-size:28px;font-weight:700;color:#16a34a;">Profit Target Reached</div>
    <div style="margin-top:8px;font-size:18px;font-weight:600;">${data.ticker}</div>
    `,
    `
    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;">
      <div style="font-size:16px;font-weight:700;color:#16a34a;">Consider taking profit in Wealthsimple</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Current price</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.currentPrice)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Target price</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.targetPrice)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Entry price</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.entryPrice)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Shares held</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.sharesHeld}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;">Estimated gain</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;">${fmtMoney(data.estimatedGain)} (${fmtPercent(data.estimatedGainPct)})</td></tr>
    </table>

    <div style="margin-top:28px;">
      <a href="${url}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">
        Open Inbox
      </a>
    </div>
    `
  )

  return { subject, html }
}