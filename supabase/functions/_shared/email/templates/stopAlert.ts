// Server only — do not import in client components

import { edgeConfig } from '../../config.ts'

export type StopAlertData = {
  ticker: string
  currentPrice: number
  stopPrice: number
  entryPrice: number
  sharesHeld: number
  estimatedLoss: number
  estimatedLossPct: number
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

export function stopAlert(data: StopAlertData): { subject: string; html: string } {
  const subject = `🔴 Stop Hit: ${data.ticker} — Exit Now`
  const url = inboxUrl(data.appUrl)

  const html = layout(
    `
    <div style="font-size:28px;font-weight:700;color:#dc2626;">Stop Hit — Exit Required</div>
    <div style="margin-top:6px;font-size:20px;font-weight:700;">${data.ticker}</div>
    `,
    `
    <div style="margin-top:20px;font-size:24px;font-weight:700;color:#dc2626;">
      Estimated loss: ${fmtMoney(Math.abs(data.estimatedLoss))}
    </div>
    <div style="margin-top:4px;color:#737373;font-size:14px;">
      ${fmtPercent(data.estimatedLossPct)} of position · ${data.sharesHeld} shares
    </div>

    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;">
      <div style="font-size:15px;font-weight:700;color:#dc2626;margin-bottom:10px;">Act now — three steps</div>
      <div style="font-size:14px;line-height:2;color:#7f1d1d;">
        <div><strong>Step 1</strong> — Open Wealthsimple immediately</div>
        <div><strong>Step 2</strong> — Place a market sell order for <strong>${data.sharesHeld} shares</strong> of <strong>${data.ticker}</strong></div>
        <div><strong>Step 3</strong> — Return to the Inbox and confirm the exit</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Current price</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;color:#dc2626;">${fmtPrice(data.currentPrice)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Stop price</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.stopPrice)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Entry price</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtPrice(data.entryPrice)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Shares held</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.sharesHeld}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;">Estimated loss</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;color:#dc2626;">${fmtMoney(Math.abs(data.estimatedLoss))} (${fmtPercent(data.estimatedLossPct)})</td></tr>
    </table>

    <div style="margin-top:20px;padding:16px;border-radius:8px;background:#f5f5f5;border:1px solid #e5e5e5;font-size:13px;color:#525252;line-height:1.6;">
      <strong>Why this matters:</strong> Cutting losses quickly is the most important rule in SEPA trading.
      A small controlled loss keeps you in the game. Do not hold hoping for a recovery —
      the stop exists for exactly this moment.
    </div>

    <div style="margin-top:28px;">
      <a href="${url}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
        Confirm Exit in Inbox →
      </a>
    </div>

    <div style="margin-top:20px;color:#a3a3a3;font-size:12px;line-height:1.6;border-top:1px solid #e5e5e5;padding-top:16px;">
      Divya Swing Engine · Urgent stop alert · All execution is manual in Wealthsimple
    </div>
    `
  )

  return { subject, html }
}