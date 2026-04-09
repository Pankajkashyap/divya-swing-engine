// Server only — do not import in client components

export type SignalReportData = {
  date: string
  marketPhase: string
  evaluated: number
  passCount: number
  watchCount: number
  failCount: number
  signalsCreated: number
  emptyWatchlist: boolean
  marketBlocked: boolean
  stockSummaries: Array<{
    ticker: string
    verdict: 'pass' | 'watch' | 'fail'
    failReason: string | null
    signalCreated: boolean
    setupGrade: string | null
  }>
  appUrl?: string
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

function phaseBanner(marketPhase: string) {
  switch (marketPhase) {
    case 'confirmed_uptrend':
      return {
        background: '#f0fdf4',
        border: '#bbf7d0',
        color: '#15803d',
        message: '✅ Market confirmed uptrend — signals permitted',
      }
    case 'under_pressure':
      return {
        background: '#fff7ed',
        border: '#fed7aa',
        color: '#c2410c',
        message: '⚠️ Market under pressure — reduced position sizing applied',
      }
    case 'rally_attempt':
      return {
        background: '#fefce8',
        border: '#fef08a',
        color: '#a16207',
        message: '👀 Rally attempt — trial size signals only (25% normal size)',
      }
    case 'correction':
      return {
        background: '#fef2f2',
        border: '#fecaca',
        color: '#dc2626',
        message: '🔴 Market in correction — no new longs. System in cash mode.',
      }
    case 'bear':
      return {
        background: '#fef2f2',
        border: '#fecaca',
        color: '#7f1d1d',
        message: '🐻 Bear market — no new longs under any circumstances.',
      }
    default:
      return {
        background: '#f5f5f5',
        border: '#e5e5e5',
        color: '#525252',
        message: '❓ Market phase unknown — update market snapshot on Dashboard',
      }
  }
}

function infoBlock(data: SignalReportData) {
  if (data.emptyWatchlist) {
    return `
    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#fefce8;border:1px solid #fef08a;color:#a16207;line-height:1.6;">
      No candidates in watchlist tonight. Your next step: check the Candidates page for stocks awaiting ChatGPT research. Researched stocks will be evaluated in tomorrow evening's scan.
    </div>
    `
  }

  if (data.marketBlocked) {
    return `
    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;line-height:1.6;">
      Market conditions block all new long signals. This is correct behaviour — SEPA® requires 100% cash in correction and bear markets. No action required. The system will resume signals when market conditions improve.
    </div>
    `
  }

  if (data.signalsCreated > 0) {
    return `
    <div style="margin-top:24px;padding:16px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;line-height:1.6;">
      Buy signal(s) generated. Check your inbox for the Trade Instruction Card(s) and place your pre-market limit order(s) in Wealthsimple before market open.
    </div>
    `
  }

  return `
  <div style="margin-top:24px;padding:16px;border-radius:8px;background:#f5f5f5;border:1px solid #e5e5e5;color:#525252;line-height:1.6;">
    ${data.evaluated} candidates evaluated. None passed all SEPA® criteria tonight. No action required — the system continues to monitor your watchlist every evening.
  </div>
  `
}

function verdictPill(verdict: 'pass' | 'watch' | 'fail') {
  if (verdict === 'pass') {
    return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;">Pass</span>`
  }
  if (verdict === 'watch') {
    return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fefce8;border:1px solid #fef08a;color:#a16207;font-size:12px;font-weight:600;">Watch</span>`
  }
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#f5f5f5;border:1px solid #e5e5e5;color:#525252;font-size:12px;font-weight:600;">Fail</span>`
}

export function signalReport(
  data: SignalReportData
): { subject: string; html: string } {
  const subject = data.signalsCreated > 0
    ? `🟢 ${data.signalsCreated} signal(s) generated — place limit order before open`
    : data.marketBlocked
      ? '⏸️ Signal Report — market phase blocked new signals'
      : data.emptyWatchlist
        ? '📋 Signal Report — watchlist empty, no candidates to evaluate'
        : `📋 Signal Report — ${data.evaluated} evaluated, no signals tonight`

  const url = inboxUrl(data.appUrl)
  const banner = phaseBanner(data.marketPhase)

  const stockRows = data.stockSummaries
    .map(
      (stock) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-weight:600;">
          ${stock.ticker ?? '—'}
          ${stock.signalCreated ? `<span style="margin-left:8px;display:inline-block;padding:2px 8px;border-radius:999px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:11px;font-weight:600;">🟢 Signal</span>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:center;">${stock.setupGrade ?? '—'}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:center;">${verdictPill(stock.verdict)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;">${stock.failReason ?? '—'}</td>
      </tr>
      `
    )
    .join('')

  const html = layout(
    `
    <div style="font-size:28px;font-weight:700;">Signal Report</div>
    <div style="margin-top:8px;color:#737373;font-size:14px;">${data.date}</div>
    `,
    `
    <div style="margin-top:24px;padding:16px;border-radius:8px;background:${banner.background};border:1px solid ${banner.border};color:${banner.color};">
      <div style="font-size:16px;font-weight:700;line-height:1.5;">
        ${banner.message}
      </div>
    </div>

    <table style="width:100%;border-collapse:separate;border-spacing:8px;margin-top:24px;">
      <tr>
        <td style="width:25%;background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:12px;color:#737373;">Evaluated</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;">${data.evaluated}</div>
        </td>
        <td style="width:25%;background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:12px;color:#737373;">Passed</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:${data.passCount > 0 ? '#15803d' : '#171717'};">${data.passCount}</div>
        </td>
        <td style="width:25%;background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:12px;color:#737373;">Watching</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:${data.watchCount > 0 ? '#a16207' : '#171717'};">${data.watchCount}</div>
        </td>
        <td style="width:25%;background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:12px;color:#737373;">Signals</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:${data.signalsCreated > 0 ? '#15803d' : '#737373'};">${data.signalsCreated}</div>
        </td>
      </tr>
    </table>

    ${infoBlock(data)}

    ${
      data.stockSummaries.length > 0
        ? `
    <div style="margin-top:28px;font-size:18px;font-weight:700;">Stock-by-stock results</div>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr>
        <th style="text-align:left;padding-bottom:10px;">Ticker</th>
        <th style="text-align:center;padding-bottom:10px;">Grade</th>
        <th style="text-align:center;padding-bottom:10px;">Verdict</th>
        <th style="text-align:left;padding-bottom:10px;">Reason</th>
      </tr>
      ${stockRows}
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
      Divya Swing Engine · Nightly signal report · All execution is manual in Wealthsimple
    </div>
    `
  )

  return { subject, html }
}