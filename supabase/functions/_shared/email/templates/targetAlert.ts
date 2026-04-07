// Server only — do not import in client components

import { edgeConfig } from '../../config.ts'

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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function fmtPrice(value: number) {
  return `$${value.toFixed(2)}`
}

function fmtPercent(value: number) {
  return `${value.toFixed(2)}%`
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

export function targetAlert(data: TargetAlertData): { subject: string; html: string } {
  const subject = `🟡 Target ${data.targetNumber} Hit: ${data.ticker}`
  const url = inboxUrl(data.appUrl)

  const guidance =
    data.targetNumber === 1
      ? `<div style="margin-top:24px;padding:16px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:14px;line-height:1.6;">
          <strong>Target 1 reached.</strong> Consider selling 1/3 to 1/2 of your position to lock in gains.
          Move your stop up to breakeven on the remaining shares and let the rest run toward Target 2.
        </div>`
      : `<div style="margin-top:24px;padding:16px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:14px;line-height:1.6;">
          <strong>Target 2 reached.</strong> Consider selling the remaining position or trailing your stop
          tightly to protect gains. Exceptional performers can be held with a very tight trailing stop.
        </div>`

  const html = layout(
    `
    <div style="font-size:28px;font-weight:700;color:#15803d;">Profit Target Reached</div>
    <div style="margin-top:6px;font-size:20px;font-weight:700;">${data.ticker} — Target ${data.targetNumber}</div>
    `,
    `
    <div style="margin-top:20px;font-size:24px;font-weight:700;color:#15803d;">
      Estimated gain: ${fmtMoney(data.estimatedGain)}
    </div>
    <div style="margin-top:4px;color:#737373;font-size:14px;">
      +${fmtPercent(data.estimatedGainPct)} from entry · ${data.sharesHeld} shares
    </div>

    ${guidance}

    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#f5f5f5;border:1px solid #e5e5e5;">
      <div style="font-size:15px;font-weight:700;margin-bottom:10px;">Four steps</div>
      <div style="font-size:14px;line-height:2;color:#525252;">
        <div><strong>Step 1</strong> — Open Wealthsimple</div>
        <div><strong>Step 2</strong> — Execute your partial or full profit-taking decision</div>
        <div><strong>Step 3</strong> — If holding remaining shares, move stop to breakeven in the app</div>
        <div><strong>Step 4</strong> — Confirm the action in the Inbox</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Current price</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;color:#15803d;">${fmtPrice(data.currentPrice)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Target ${data.targetNumber} price</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.targetPrice)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Entry price</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.entryPrice)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Shares held</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.sharesHeld}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;">Estimated gain</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;color:#15803d;">${fmtMoney(data.estimatedGain)} (${fmtPercent(data.estimatedGainPct)})</td></tr>
    </table>

    <div style="margin-top:28px;">
      <a href="${url}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
        Manage Trade in Inbox →
      </a>
    </div>

    <div style="margin-top:20px;color:#a3a3a3;font-size:12px;line-height:1.6;border-top:1px solid #e5e5e5;padding-top:16px;">
      Divya Swing Engine · Profit target alert · All execution is manual in Wealthsimple
    </div>
    `
  )

  return { subject, html }
}