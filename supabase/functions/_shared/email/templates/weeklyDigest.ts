// Server only — do not import in client components

export type DailyDigestData = {
  date: string
  marketPhase: string
  openTradesCount: number
  signalsFiredCount: number
  flaggedWatchlistCount: number
  unresolvedActionsCount: number
  openTrades: Array<{
    ticker: string
    entryPrice: number
    currentStop: number
    target1: number
  }>
  appUrl?: string
}

function fmtPrice(value: number) {
  return `$${value.toFixed(2)}`
}

function inboxUrl(appUrl?: string) {
  return `${appUrl ?? Deno.env.get('APP_BASE_URL') ?? ''}/inbox`
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

export function dailyDigest(data: DailyDigestData): {
  subject: string
  html: string
} {
  const subject = `📊 Daily Digest — ${data.date} · ${data.marketPhase}`
  const url = inboxUrl(data.appUrl)

  const tradeRows = data.openTrades
    .map(
      (trade) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-weight:600;">${trade.ticker}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;">${fmtPrice(trade.entryPrice)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;">${fmtPrice(trade.currentStop)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;">${fmtPrice(trade.target1)}</td>
      </tr>
    `
    )
    .join('')

  const phaseBanner =
    data.marketPhase === 'confirmed_uptrend'
      ? `
      <div style="margin-top:24px;padding:16px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;">
        ✅ Market is in a confirmed uptrend. New long entries are permitted.
      </div>
    `
      : data.marketPhase === 'under_pressure'
        ? `
      <div style="margin-top:24px;padding:16px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;">
        ⚠️ Market is under pressure. Reduce new long exposure. Be selective.
      </div>
    `
        : data.marketPhase === 'rally_attempt'
          ? `
      <div style="margin-top:24px;padding:16px;border-radius:8px;background:#fefce8;border:1px solid #fef08a;color:#a16207;">
        👀 Rally attempt in progress. Wait for a confirmed Follow-Through Day before adding new positions.
      </div>
    `
          : data.marketPhase === 'correction'
            ? `
      <div style="margin-top:24px;padding:16px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;">
        🔴 Market is in correction. No new long entries. Stay in cash.
      </div>
    `
            : `
      <div style="margin-top:24px;padding:16px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#7f1d1d;">
        🐻 Bear market conditions. No new long entries under any circumstances.
      </div>
    `

  const html = layout(
    `<div style="font-size:28px;font-weight:700;">Daily Digest</div>`,
    `
    ${phaseBanner}

    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Market phase</td><td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.marketPhase}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Open trades</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.openTradesCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Signals fired</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.signalsFiredCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Flagged watchlist</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.flaggedWatchlistCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;">Unresolved actions</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;">${data.unresolvedActionsCount}</td></tr>
    </table>

    ${
      data.openTradesCount === 0 && data.signalsFiredCount === 0
        ? `
      <p style="margin-top:20px;color:#737373;line-height:1.6;">
        No signals fired today. This is normal in the current market environment. The system continues
        to monitor your watchlist and will alert you when a qualifying setup emerges.
      </p>
    `
        : ''
    }

    ${
      data.unresolvedActionsCount > 0
        ? `
      <div style="margin-top:20px;padding:16px;border-radius:8px;background:#fefce8;border:1px solid #fef08a;color:#a16207;">
        You have ${data.unresolvedActionsCount} unresolved action(s) in your Inbox. Review them before
        placing any new trades.
      </div>
    `
        : ''
    }

    ${
      data.openTrades.length > 0
        ? `
      <div style="margin-top:28px;font-size:18px;font-weight:700;">Open Trades</div>
      <div style="margin-top:8px;color:#737373;font-size:14px;line-height:1.6;">
        Monitor these positions. If a stop is hit, exit in Wealthsimple immediately then confirm
        in the Inbox.
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tr>
          <th style="text-align:left;padding-bottom:10px;">Ticker</th>
          <th style="text-align:right;padding-bottom:10px;">Entry</th>
          <th style="text-align:right;padding-bottom:10px;">Stop</th>
          <th style="text-align:right;padding-bottom:10px;">Target 1</th>
        </tr>
        ${tradeRows}
      </table>
    `
        : ''
    }

    <div style="margin-top:28px;">
      <a href="${url}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">
        Open Inbox →
      </a>
    </div>
    `
  )

  return { subject, html }
}