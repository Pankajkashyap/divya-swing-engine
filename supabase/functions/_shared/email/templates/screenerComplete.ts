// Server only — do not import in client components

export type ScreenerCompleteData = {
  date: string
  addedCount: number
  scannedCount: number
  candidates: Array<{
    ticker: string
    companyName: string | null
    epsGrowthPct: number | null
    revenueGrowthPct: number | null
    screenedPrice: number | null
  }>
  appUrl?: string
}

function fmtPrice(value: number) {
  return `$${value.toFixed(2)}`
}

function candidatesUrl(appUrl?: string) {
  return `${appUrl ?? Deno.env.get('APP_BASE_URL') ?? ''}/candidates`
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

function fmtGrowth(value: number | null) {
  if (value === null) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function screenerComplete(data: ScreenerCompleteData): {
  subject: string
  html: string
} {
  const subject = `🔍 Screener Complete — ${data.addedCount} new candidates ready`
  const url = candidatesUrl(data.appUrl)

  const candidateRows = data.candidates
    .map(
      (candidate) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-weight:600;">${candidate.ticker}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;">${candidate.companyName ?? '—'}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;color:${candidate.epsGrowthPct !== null && candidate.epsGrowthPct > 0 ? '#15803d' : '#171717'};">${fmtGrowth(candidate.epsGrowthPct)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;color:${candidate.revenueGrowthPct !== null && candidate.revenueGrowthPct > 0 ? '#15803d' : '#171717'};">${fmtGrowth(candidate.revenueGrowthPct)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-family:monospace;font-weight:600;">${candidate.screenedPrice !== null ? fmtPrice(candidate.screenedPrice) : '—'}</td>
      </tr>
    `
    )
    .join('')

  const html = layout(
    `<div style="font-size:28px;font-weight:700;">Screener Complete</div>`,
    `
    <table style="width:100%;border-collapse:collapse;margin-top:24px;">
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Tickers scanned</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.scannedCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">New candidates added</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.addedCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;">Date</td><td style="padding:10px 0;text-align:right;font-weight:600;">${data.date}</td></tr>
    </table>

    ${
      data.addedCount > 0
        ? `
      <div style="margin-top:28px;font-size:18px;font-weight:700;">New Candidates</div>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tr>
          <th style="text-align:left;padding-bottom:10px;">Ticker</th>
          <th style="text-align:left;padding-bottom:10px;">Company</th>
          <th style="text-align:right;padding-bottom:10px;">EPS Growth</th>
          <th style="text-align:right;padding-bottom:10px;">Revenue Growth</th>
          <th style="text-align:right;padding-bottom:10px;">Price</th>
        </tr>
        ${candidateRows}
      </table>
    `
        : `
      <p style="margin-top:28px;color:#737373;line-height:1.6;">
        No new candidates passed the screener filters tonight.
        The screener will run again tomorrow night.
      </p>
    `
    }

    <div style="margin-top:28px;">
      <a href="${url}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;">
        Review Candidates
      </a>
    </div>

    <p style="margin-top:16px;color:#737373;font-size:13px;line-height:1.6;">
      Open the Candidates page, copy the research prompt,
      paste into ChatGPT with web browsing enabled, and
      import the results before 3:30 PM MT tomorrow.
    </p>
    `
  )

  return { subject, html }
}