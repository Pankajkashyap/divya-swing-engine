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
  const subject = `⚠️ Watchlist Review: ${data.flaggedStocks.length} stocks need attention`
  const url = inboxUrl(data.appUrl)

  const rows = data.flaggedStocks
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-weight:600;">${item.ticker}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;text-align:center;font-family:monospace;font-weight:600;">${item.consecutiveFailCount}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;${item.lastHardFailReason ? '' : 'color:#737373;'}">${item.lastHardFailReason ?? 'Not recorded'}</td>
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
      <div style="font-size:15px;font-weight:700;">These stocks have failed SEPA rule evaluation 3 or more consecutive times.</div>
      <div style="margin-top:6px;color:#737373;font-size:14px;">Review each one in the Inbox and decide whether to keep monitoring or remove it from your watchlist.</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <tr>
        <th style="text-align:left;padding:0 12px 12px 12px;font-size:12px;color:#737373;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;">Ticker</th>
        <th style="text-align:center;padding:0 12px 12px 12px;font-size:12px;color:#737373;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;">Consecutive Fails</th>
        <th style="text-align:left;padding:0 12px 12px 12px;font-size:12px;color:#737373;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;">Last Fail Reason</th>
      </tr>
      ${rows || `<tr><td colspan="3" style="padding:12px;color:#737373;">No flagged stocks.</td></tr>`}
    </table>

    <div style="margin-top:16px;color:#737373;font-size:13px;line-height:1.6;">
      For each flagged stock: open the Inbox, click <strong style="color:#171717;">Keep</strong> if you believe conditions will improve, or <strong style="color:#171717;">Remove</strong> if the thesis is broken. Stocks not actioned will continue to be flagged on future review cycles.
    </div>

    <div style="margin-top:28px;">
      <a href="${url}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">
        Review Flagged Stocks →
      </a>
    </div>
    `
  )

  return { subject, html }
}