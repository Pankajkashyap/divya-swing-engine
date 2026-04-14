// Server only — do not import in client components

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
  current_market_phase?: string | null
  ftd_confidence?: string | null
}

function fmtMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function fmtPnl(value: number) {
  const formatted = fmtMoney(Math.abs(value))
  if (value > 0) return `<span style="color:#15803d;font-weight:600;">+${formatted}</span>`
  if (value < 0) return `<span style="color:#dc2626;font-weight:600;">-${formatted}</span>`
  return `<span style="font-weight:600;">${formatted}</span>`
}

function weeklyReviewUrl(appUrl?: string) {
  return `${appUrl ?? Deno.env.get('APP_BASE_URL') ?? ''}/weekly-review`
}

function inboxUrl(appUrl?: string) {
  return `${appUrl ?? Deno.env.get('APP_BASE_URL') ?? ''}/inbox`
}

function candidatesUrl(appUrl?: string) {
  return `${appUrl ?? Deno.env.get('APP_BASE_URL') ?? ''}/candidates`
}

function dashboardUrl(appUrl?: string) {
  return `${appUrl ?? Deno.env.get('APP_BASE_URL') ?? ''}/`
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

function buildMarketSnapshotReminder(data: WeeklyDigestData) {
  const dashboard = dashboardUrl(data.appUrl)
  const currentPhase = data.current_market_phase ?? null
  const ftdConfidence = data.ftd_confidence ?? null

  const ftdConfidenceLine =
    ftdConfidence === 'high'
      ? `<div style="margin-top:10px;font-size:14px;font-weight:700;color:#15803d;">Current FTD confidence: HIGH</div>`
      : ftdConfidence === 'medium'
        ? `<div style="margin-top:10px;font-size:14px;font-weight:700;color:#b45309;">Current FTD confidence: MEDIUM</div>`
        : ftdConfidence === 'low'
          ? `<div style="margin-top:10px;font-size:14px;font-weight:700;color:#dc2626;">Current FTD confidence: LOW</div>`
          : ''

  const phaseAlert =
    currentPhase === 'confirmed_uptrend'
      ? `
      <div style="margin-top:16px;padding:16px;border-radius:8px;background:#fffbeb;border:1px solid #f59e0b;">
        <div style="font-size:15px;font-weight:700;color:#92400e;">⚠️ Phase is Confirmed Uptrend — Check FTD Confidence Before Trading</div>
        <div style="margin-top:8px;font-size:14px;line-height:1.7;color:#78350f;">
          Your system has detected an active Follow-Through Day. Before deploying any capital, check the FTD Confidence indicator in the Market card on your app Dashboard:
          <div style="margin-top:8px;">✅ HIGH — System confident. Proceed with A and A+ setups.</div>
          <div>⚠️ MEDIUM — Glance at TradingView to confirm the FTD date looks correct before entering.</div>
          <div>⚠️ LOW — Always verify the FTD manually on TradingView before any capital deployment.</div>
          ${ftdConfidenceLine}
        </div>
      </div>
      `
      : currentPhase === 'rally_attempt'
        ? `
        <div style="margin-top:16px;padding:16px;border-radius:8px;background:#eff6ff;border:1px solid #60a5fa;">
          <div style="font-size:15px;font-weight:700;color:#1d4ed8;">Rally Attempt in Progress</div>
          <div style="margin-top:8px;font-size:14px;line-height:1.7;color:#1e40af;">
            No confirmed Follow-Through Day yet. Maximum 25% exposure. Watch for an FTD on Day 4 or later — a 1.7%+ close on higher volume than the prior day. Do not deploy full capital until confirmed.
          </div>
        </div>
        `
        : currentPhase === 'correction'
          ? `
          <div style="margin-top:16px;padding:16px;border-radius:8px;background:#fef2f2;border:1px solid #f87171;">
            <div style="font-size:15px;font-weight:700;color:#b91c1c;">🔴 Market in Correction — Stay in Cash</div>
            <div style="margin-top:8px;font-size:14px;line-height:1.7;color:#991b1b;">
              No new long entries. The system will block trade plans automatically. Apply the market snapshot to confirm the current phase.
            </div>
          </div>
          `
          : currentPhase === 'bear'
            ? `
            <div style="margin-top:16px;padding:16px;border-radius:8px;background:#7f1d1d;border:1px solid #991b1b;">
              <div style="font-size:15px;font-weight:700;color:#fecaca;">🐻 Bear Market — Capital Preservation Mode</div>
              <div style="margin-top:8px;font-size:14px;line-height:1.7;color:#fee2e2;">
                No new long entries under any circumstances.
              </div>
            </div>
            `
              : currentPhase === 'under_pressure'
            ? `
            <div style="margin-top:16px;padding:16px;border-radius:8px;background:#fff7ed;border:1px solid #fb923c;">
              <div style="font-size:15px;font-weight:700;color:#c2410c;">⚠️ Market Under Pressure</div>
              <div style="margin-top:8px;font-size:14px;line-height:1.7;color:#9a3412;">
                A+ setups only. Reduce position sizes. Tighten stops on existing positions. No aggressive new entries.
              </div>
            </div>
            `
            : `
            <div style="margin-top:16px;padding:16px;border-radius:8px;background:#f5f5f5;border:1px solid #e5e5e5;">
              <div style="font-size:14px;line-height:1.7;color:#525252;">
                Apply the market snapshot on the Dashboard to confirm the current phase before placing any trades this week.
              </div>
            </div>
            `

  return `
    <div style="margin-top:24px;padding:20px;border-radius:8px;background:#fafafa;border:1px solid #e5e5e5;">
      <div style="font-size:18px;font-weight:700;">📋 Market Snapshot — Action Required</div>
      <div style="margin-top:10px;font-size:14px;line-height:1.7;color:#525252;">
        Your technical indicators were calculated automatically overnight. Complete these steps before placing any trades this week:
      </div>
      <div style="margin-top:10px;font-size:14px;line-height:1.9;color:#525252;">
        <div>1. Open the <a href="${dashboard}" style="color:#171717;text-decoration:underline;">app Dashboard</a></div>
        <div>2. Click "Copy prompt" in Step 1</div>
        <div>3. Open ChatGPT with web browsing enabled — paste the prompt</div>
        <div>4. Copy the 4-field JSON response</div>
        <div>5. Paste into Step 2 → click Apply</div>
      </div>
      ${phaseAlert}
    </div>
  `
}

export function weeklyDigest(data: WeeklyDigestData): { subject: string; html: string } {
  const subject = `📈 Weekly Review — Week ending ${data.weekEnding}`
  const reviewUrl = weeklyReviewUrl(data.appUrl)
  const inbox = inboxUrl(data.appUrl)
  const candidates = candidatesUrl(data.appUrl)
  const dashboard = dashboardUrl(data.appUrl)

  const winRate =
    data.closedTradesCount > 0
      ? `${((data.winsCount / data.closedTradesCount) * 100).toFixed(1)}%`
      : '—'

  const marketSnapshotReminder = buildMarketSnapshotReminder(data)

  const html = layout(
    `
    <div style="font-size:28px;font-weight:700;">Weekly Review</div>
    <div style="margin-top:6px;color:#737373;font-size:14px;">Week ending ${data.weekEnding}</div>
    `,
    `
    ${marketSnapshotReminder}

    <div style="margin-top:24px;font-size:18px;font-weight:700;">Performance</div>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Closed trades</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.closedTradesCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Wins</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;color:#15803d;">${data.winsCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Losses</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;color:#dc2626;">${data.lossesCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Win rate</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${winRate}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Realized P&L</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #e5e5e5;">${fmtPnl(data.totalRealizedPnl)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Avg win</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;color:#15803d;">${fmtMoney(data.avgWin)}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;">Avg loss</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;color:#dc2626;">${fmtMoney(data.avgLoss)}</td></tr>
    </table>

    ${data.closedTradesCount === 0 ? `
      <p style="margin-top:16px;color:#737373;font-size:14px;line-height:1.6;">
        No trades were closed this week. Keep building the watchlist and waiting for
        the right market conditions.
      </p>` : ''}

    <div style="margin-top:28px;font-size:18px;font-weight:700;">Portfolio</div>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Open trades</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.openTradesCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Watchlist</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.watchlistCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;border-bottom:1px solid #e5e5e5;">Flagged stocks</td><td style="padding:10px 0;text-align:right;font-family:monospace;font-weight:600;border-bottom:1px solid #e5e5e5;">${data.flaggedCount}</td></tr>
      <tr><td style="padding:10px 0;color:#737373;">Market phase</td><td style="padding:10px 0;text-align:right;font-weight:600;">${data.marketPhase.replace(/_/g, ' ')}</td></tr>
    </table>

    <div style="margin-top:28px;padding:16px;border-radius:8px;background:#f5f5f5;border:1px solid #e5e5e5;">
      <div style="font-size:15px;font-weight:700;margin-bottom:10px;">Your Sunday evening checklist</div>
      <div style="font-size:14px;line-height:1.9;color:#525252;">
        <div>1. <a href="${dashboard}" style="color:#171717;text-decoration:underline;">Update the market snapshot</a> using the ChatGPT prompt on the Dashboard</div>
        <div>2. <a href="${reviewUrl}" style="color:#171717;text-decoration:underline;">Complete your Weekly Review</a> — wins, losses, lessons, focus for next week</div>
        <div>3. <a href="${candidates}" style="color:#171717;text-decoration:underline;">Check the Candidates page</a> for stocks awaiting ChatGPT research</div>
        <div>4. <a href="${inbox}" style="color:#171717;text-decoration:underline;">Clear your Inbox</a> — resolve any pending actions from the week</div>
      </div>
    </div>

    <div style="margin-top:28px;">
      <a href="${reviewUrl}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
        Complete Weekly Review →
      </a>
    </div>

    <div style="margin-top:12px;">
      <a href="${inbox}" style="color:#737373;font-size:13px;text-decoration:underline;">Open Inbox</a>
    </div>

    <div style="margin-top:20px;color:#a3a3a3;font-size:12px;line-height:1.6;border-top:1px solid #e5e5e5;padding-top:16px;">
      Divya Swing Engine · Weekly performance summary · All execution is manual in Wealthsimple
    </div>
    `
  )

  return { subject, html }
}