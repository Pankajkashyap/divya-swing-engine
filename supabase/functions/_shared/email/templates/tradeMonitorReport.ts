// Server only — do not import in client components

export type TradeMonitorReportData = {
  date: string
  marketWindow: string
  monitoredCount: number
  stopAlertsFired: number
  target1AlertsFired: number
  target2AlertsFired: number
  noOpenTrades: boolean
  tradeSummaries: Array<{
    ticker: string
    currentPrice: number | null
    entryPrice: number | null
    stopPrice: number | null
    target1Price: number | null
    target2Price: number | null
    stopAlertFired: boolean
    target1AlertFired: boolean
    target2AlertFired: boolean
    sharesHeld: number
  }>
  appUrl?: string
}

function fmtPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `$${value.toFixed(2)}`
}

function inboxUrl(appUrl?: string) {
  return `${appUrl ?? ''}/inbox`
}

function formatMarketWindow(marketWindow: string): string {
  switch (marketWindow) {
    case 'pre_market':
      return 'Pre-Market'
    case 'market_open':
      return 'Market Open'
    case 'post_market':
      return 'Post-Market'
    case 'closed':
      return 'Closed'
    default:
      return marketWindow || 'Unknown'
  }
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

function summaryCell(value: number, accent: 'neutral' | 'red' | 'green') {
  const styles =
    accent === 'red'
      ? {
          background: value > 0 ? '#fef2f2' : '#fafafa',
          border: value > 0 ? '#fecaca' : '#e5e5e5',
          color: value > 0 ? '#dc2626' : '#737373',
        }
      : accent === 'green'
        ? {
            background: value > 0 ? '#f0fdf4' : '#fafafa',
            border: value > 0 ? '#bbf7d0' : '#e5e5e5',
            color: value > 0 ? '#15803d' : '#737373',
          }
        : {
            background: '#fafafa',
            border: '#e5e5e5',
            color: '#171717',
          }

  return `background:${styles.background};border:1px solid ${styles.border};border-radius:8px;padding:12px;text-align:center;`
}

function statusPill(trade: TradeMonitorReportData['tradeSummaries'][number]) {
  if (trade.stopAlertFired) {
    return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;font-size:12px;font-weight:600;">🔴 Stop Hit</span>`
  }
  if (trade.target2AlertFired) {
    return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;">🟢 T2 Hit</span>`
  }
  if (trade.target1AlertFired) {
    return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;">🟡 T1 Hit</span>`
  }
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#f5f5f5;border:1px solid #e5e5e5;color:#525252;font-size:12px;font-weight:600;">✓ Clear</span>`
}

function currentPriceStyle(
  currentPrice: number | null,
  stopPrice: number | null,
  target1Price: number | null
) {
  if (
    currentPrice != null &&
    stopPrice != null &&
    Number.isFinite(currentPrice) &&
    Number.isFinite(stopPrice) &&
    currentPrice <= stopPrice
  ) {
    return 'color:#dc2626;'
  }

  if (
    currentPrice != null &&
    target1Price != null &&
    Number.isFinite(currentPrice) &&
    Number.isFinite(target1Price) &&
    currentPrice >= target1Price
  ) {
    return 'color:#15803d;'
  }

  return 'color:#171717;'
}

function infoBlock(data: TradeMonitorReportData) {
  if (data.noOpenTrades) {
    return `
    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#f5f5f5;border:1px solid #e5e5e5;color:#525252;line-height:1.6;">
      No open positions to monitor. The system checked for open trades and found none. When you enter a trade via the Inbox, it will appear here automatically.
    </div>
    `
  }

  if (data.stopAlertsFired > 0) {
    return `
    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;line-height:1.6;">
      <div style="font-weight:700;margin-bottom:6px;">Immediate action required</div>
      One or more positions have hit their stop price. Check your Inbox immediately and exit in Wealthsimple. Do not delay — cutting losses quickly is the most important rule in SEPA®.
    </div>
    `
  }

  if (data.target1AlertsFired > 0 || data.target2AlertsFired > 0) {
    return `
    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;line-height:1.6;">
      One or more positions have reached a profit target. Check your Inbox and decide whether to take partial profits, trail your stop, or hold for the next target.
    </div>
    `
  }

  return `
  <div style="margin-top:24px;padding:16px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;line-height:1.6;">
    All ${data.monitoredCount} position(s) monitored. No stops hit. No targets reached. No action required — let your trades run.
  </div>
  `
}

export function tradeMonitorReport(
  data: TradeMonitorReportData
): { subject: string; html: string } {
  const subject =
    data.stopAlertsFired > 0
      ? `🔴 Stop hit on ${data.stopAlertsFired} position(s) — exit required`
      : data.target1AlertsFired > 0 || data.target2AlertsFired > 0
        ? '🟡 Profit target reached — review your positions'
        : data.noOpenTrades
          ? '📊 Trade Monitor — no open positions'
          : `📊 Trade Monitor — ${data.monitoredCount} position(s) monitored, all clear`

  const url = inboxUrl(data.appUrl)

  const rows = data.tradeSummaries
    .map(
      (trade) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-weight:600;">${trade.ticker ?? '—'}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;">${trade.sharesHeld}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;${currentPriceStyle(trade.currentPrice, trade.stopPrice, trade.target1Price)}">${fmtPrice(trade.currentPrice)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;">${fmtPrice(trade.entryPrice)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;">${fmtPrice(trade.stopPrice)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;">${fmtPrice(trade.target1Price)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;">${fmtPrice(trade.target2Price)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:center;">${statusPill(trade)}</td>
      </tr>
      `
    )
    .join('')

  const html = layout(
    `
    <div style="font-size:28px;font-weight:700;">Trade Monitor</div>
    <div style="margin-top:8px;color:#737373;font-size:14px;">${data.date} · ${formatMarketWindow(data.marketWindow)}</div>
    `,
    `
    <table style="width:100%;border-collapse:separate;border-spacing:8px;margin-top:24px;">
      <tr>
        <td style="${summaryCell(data.monitoredCount, 'neutral')}">
          <div style="font-size:12px;color:#737373;">Monitored</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;">${data.monitoredCount}</div>
        </td>
        <td style="${summaryCell(data.stopAlertsFired, 'red')}">
          <div style="font-size:12px;color:#737373;">Stop Alerts</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:${data.stopAlertsFired > 0 ? '#dc2626' : '#737373'};">${data.stopAlertsFired}</div>
        </td>
        <td style="${summaryCell(data.target1AlertsFired, 'green')}">
          <div style="font-size:12px;color:#737373;">T1 Alerts</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:${data.target1AlertsFired > 0 ? '#15803d' : '#737373'};">${data.target1AlertsFired}</div>
        </td>
        <td style="${summaryCell(data.target2AlertsFired, 'green')}">
          <div style="font-size:12px;color:#737373;">T2 Alerts</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:${data.target2AlertsFired > 0 ? '#15803d' : '#737373'};">${data.target2AlertsFired}</div>
        </td>
      </tr>
    </table>

    ${infoBlock(data)}

    ${
      data.tradeSummaries.length > 0
        ? `
    <div style="margin-top:28px;font-size:18px;font-weight:700;">Position-by-position results</div>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr>
        <th style="text-align:left;padding-bottom:10px;">Ticker</th>
        <th style="text-align:right;padding-bottom:10px;">Shares</th>
        <th style="text-align:right;padding-bottom:10px;">Current</th>
        <th style="text-align:right;padding-bottom:10px;">Entry</th>
        <th style="text-align:right;padding-bottom:10px;">Stop</th>
        <th style="text-align:right;padding-bottom:10px;">T1</th>
        <th style="text-align:right;padding-bottom:10px;">T2</th>
        <th style="text-align:center;padding-bottom:10px;">Status</th>
      </tr>
      ${rows}
    </table>
    `
        : ''
    }

    <div style="margin-top:28px;">
      <a href="${url}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">
        Open Inbox →
      </a>
    </div>

    <div style="margin-top:24px;color:#737373;font-size:13px;line-height:1.6;">
      Divya Swing Engine · Automated trade monitor · All execution is manual in Wealthsimple
    </div>
    `
  )

  return { subject, html }
}