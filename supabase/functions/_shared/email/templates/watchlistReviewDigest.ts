// Server only — do not import in client components

import { edgeConfig } from '../../config.ts'


export type WatchlistReviewItem = {
  ticker: string
  consecutiveFailCount: number
  lastHardFailReason: string | null
}

export type WatchlistReviewDigestData = {
  flaggedStocks: WatchlistReviewItem[]
  reviewDate: string
  appUrl?: string
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

export function watchlistReviewDigest(data: WatchlistReviewDigestData): {
  subject: string
  html: string
} {
  const subject = `⚠️ Watchlist Review: ${data.flaggedStocks.length} stocks flagged`
  const url = inboxUrl(data.appUrl)

  const rows = data.flaggedStocks
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-weight:600;">${item.ticker}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;">${item.consecutiveFailCount}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0 0 12px 0;border-bottom:1px solid #e5e5e5;color:#737373;font-size:13px;">
          ${item.lastHardFailReason ?? 'No reason recorded'}
        </td>
      </tr>
    `
    )
    .join('')

  const html = layout(
    `
    <div style="font-size:28px;font-weight:700;">Watchlist Review</div>
    <div style="margin-top:8px;color:#737373;font-size:14px;">${fmtDate(data.reviewDate)}</div>
    `,
    `
    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#faf5ff;border:1px solid #e9d5ff;">
      <div style="font-size:16px;font-weight:700;">Log in to keep or archive each stock</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <tr>
        <th style="text-align:left;padding-bottom:12px;">Ticker</th>
        <th style="text-align:right;padding-bottom:12px;">Fail count</th>
      </tr>
      ${rows || `<tr><td colspan="2" style="padding:12px 0;color:#737373;">No flagged stocks.</td></tr>`}
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