import { APP_BASE_URL } from '@/app/trading/lib/config'

export type WeeklyDigestData = {
  weekEnding: string
  marketPhase: string
  openTradesCount: number
  closedTradesCount: number
  winsCount: number
  lossesCount: number
  totalRealizedPnl: number
  avgWin: number
  avgLoss: number
  watchlistCount: number
  flaggedCount: number
  appUrl?: string
}

function fmtMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
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

export function weeklyDigest(data: WeeklyDigestData): {
  subject: string
  html: string
} {
  const subject = `📈 Weekly Review — Week ending ${data.weekEnding}`
  const url = inboxUrl(data.appUrl)

  const html = layout(
    `<div style="font-size:28px;font-weight:700;">Weekly Review</div>`,
    `
    <div style="margin-top:24px;font-size:18px;font-weight:700;">Performance Summary</div>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Wins</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.winsCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Losses</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.lossesCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Closed trades</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.closedTradesCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Realized P&L</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtMoney(data.totalRealizedPnl)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Avg win</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${fmtMoney(data.avgWin)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;">Avg loss</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;">${fmtMoney(data.avgLoss)}</td></tr>
    </table>

    <div style="margin-top:28px;font-size:18px;font-weight:700;">Portfolio</div>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Open trades</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.openTradesCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Watchlist count</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.watchlistCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Flagged count</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.flaggedCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;">Market phase</td><td style="padding:10px 0;text-align:right;font-weight:600;">${data.marketPhase}</td></tr>
    </table>

    <div style="margin-top:28px;">
      <a href="${url}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">
        Open Inbox
      </a>
    </div>

    <div style="margin-top:20px;color:#737373;font-size:13px;">
      Complete your weekly review in the app.
    </div>
    `
  )

  return { subject, html }
}