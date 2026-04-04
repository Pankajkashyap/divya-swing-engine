'use client'

import Link from 'next/link'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-neutral-700 dark:text-neutral-300">
        {children}
      </div>
    </section>
  )
}

function Term({
  term,
  definition,
}: {
  term: string
  definition: string
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{term}</p>
      <p className="mt-1 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{definition}</p>
    </div>
  )
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <section className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
                Divya Swing Engine
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                Documentation & Learning Guide
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600 dark:text-neutral-400">
                This page explains how to use the platform step by step, what the main trading terms mean,
                and how the engine makes decisions. It is written for someone who is new to trading and new
                to this app.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/"
                className="ui-link-pill-idle"
              >
                Dashboard
              </Link>

              <Link
                href="/weekly-review"
                className="ui-link-pill-idle"
              >
                Weekly Review
              </Link>
            </div>
          </div>
        </div>

        <Section title="1. Start Here: What This Platform Does">
          <p>
            This platform is now an autonomous swing trading assistant, not just a manual planning tool.
            It runs on a schedule in the background and continuously scans the market, evaluates watchlist
            stocks, generates trade plans, and monitors open trades without you having to trigger each step manually.
          </p>
          <p>
            The system sends you email notifications when action is required. If a qualifying buy setup is
            found, you receive a trade instruction email. If an open trade hits a stop or reaches a target,
            you receive an urgent alert. At the end of the day and week, you receive digest emails summarising
            what happened.
          </p>
          <p>
            The most important design principle is <strong>human in the loop</strong>. The system never places
            orders for you. All execution happens manually in Wealthsimple. Every buy and every sell still
            requires your explicit confirmation.
          </p>
          <p>
            The <strong>Inbox</strong> is the centre of that confirmation layer. This is where you review pending
            actions, confirm signals after acting in Wealthsimple, dismiss items you do not want to take, or
            snooze items you want to revisit later.
          </p>
        </Section>

        <Section title="2. Your Daily Routine">
          <div className="space-y-5">
            <div>
              <p className="font-semibold">Morning</p>
              <p>
                Check your email. If the evening scan found qualifying setups, a Trade Instruction Card arrived
                overnight. Open the app Inbox to review it.
              </p>
              <p>
                If you want to act on a signal, place a limit buy order in Wealthsimple using the exact entry
                zone, stop, and share count from the card. Then return to the Inbox and tap <strong>Executed</strong>,
                entering your actual fill price and quantity. The app creates the trade record.
              </p>
            </div>

            <div>
              <p className="font-semibold">During the day</p>
              <p>
                You do not need to watch the market. The system monitors your open trades automatically at
                8:30 AM, 12:30 PM, and 4:30 PM ET. If a stop is hit or a target is reached, an urgent email
                arrives. Act in Wealthsimple first, then confirm in the Inbox.
              </p>
            </div>

            <div>
              <p className="font-semibold">Evening</p>
              <p>
                The system runs its main scan at 4:30 PM ET after market close. It evaluates your entire
                watchlist, refreshes fundamentals, flags weak stocks for review, and sends a daily digest
                email summarising the day.
              </p>
            </div>

            <div>
              <p className="font-semibold">Sunday evening</p>
              <p>
                A weekly digest email arrives covering your performance for the week — wins, losses, P&amp;L,
                and watchlist health. Open the Weekly Review page to complete your review and write your
                focus for next week.
              </p>
            </div>
          </div>
        </Section>

        <Section title="3. The Five Pages">
          <div className="space-y-4">
            <div>
              <p className="font-semibold">Dashboard</p>
              <p>
                The main trading workspace. Add and manage watchlist stocks, run manual evaluations, generate
                trade plans, and manage open trades. It also shows portfolio heat and exposure.
              </p>
            </div>

            <div>
              <p className="font-semibold">Inbox</p>
              <p>
                The action centre. All buy signals, stop alerts, target alerts, and watchlist review items
                appear here sorted by urgency. Every automated signal requires your confirmation before anything
                happens.
              </p>
            </div>

            <div>
              <p className="font-semibold">Candidates</p>
              <p>
                The screener research hub. Stocks discovered by the autonomous screener appear here awaiting
                research. Copy the pre-built ChatGPT prompt with one click, paste into ChatGPT to fill in
                missing technical fields, paste the result back, and click Apply to bulk-update all candidates
                at once.
              </p>
            </div>

            <div>
              <p className="font-semibold">Weekly Review</p>
              <p>
                Your end-of-week reset. Review closed trades, wins, losses, realized P&amp;L, rule violations,
                and write your focus for next week.
              </p>
            </div>

            <div>
              <p className="font-semibold">Settings</p>
              <p>
                Control your portfolio value, notification email, scan schedule (evening only vs three times
                daily), buy signal expiry, morning trade monitor toggle, and screener preferences.
              </p>
            </div>
          </div>
        </Section>

        <Section title="4. How the Autonomous System Works">
          <p>
            The automation layer is powered by scheduled Edge Functions running through Supabase pg_cron.
            Each function has a narrow job. Together they create the daily operating rhythm of the app.
          </p>

          <div className="space-y-4">
            <div>
              <p className="font-semibold">market-scan</p>
              <p>
                Checks SPY and QQQ to determine the current market phase. Runs three times daily.
              </p>
            </div>

            <div>
              <p className="font-semibold">watchlist-evaluate</p>
              <p>
                Re-evaluates every watchlist stock against SEPA rules using live Massive market data. Runs at
                4:30 PM ET in evening-only mode, or three times daily if that setting is enabled.
              </p>
            </div>

            <div>
              <p className="font-semibold">trade-monitor</p>
              <p>
                Checks current prices for all open trades against stops and targets. Runs three times daily.
              </p>
            </div>

            <div>
              <p className="font-semibold">fundamentals-refresh</p>
              <p>
                Refreshes EPS and revenue data for watchlist stocks. Runs once daily after market close.
              </p>
            </div>

            <div>
              <p className="font-semibold">watchlist-review</p>
              <p>
                Flags stocks that have failed hard rules three or more consecutive times. Runs once daily after
                market close.
              </p>
            </div>

            <div>
              <p className="font-semibold">watchlist-screener</p>
              <p>
                Discovers new stock candidates from the S&amp;P 500 and NASDAQ 100 universe using Massive market
                data. Runs nightly.
              </p>
            </div>

            <div>
              <p className="font-semibold">daily-digest</p>
              <p>
                Sends a summary email at 4:40 PM ET.
              </p>
            </div>

            <div>
              <p className="font-semibold">weekly-digest</p>
              <p>
                Sends a performance summary email on Sunday evening.
              </p>
            </div>

            <div>
              <p className="font-semibold">expire-pending-actions</p>
              <p>
                Cleans up stale buy signals from the Inbox. Runs hourly.
              </p>
            </div>
          </div>
        </Section>

        <Section title="5. The ChatGPT Research Workflow">
          <div className="space-y-5">
            <div>
              <p className="font-semibold">Step 1 — Nightly screener discovery</p>
              <p>
                The nightly screener identifies stocks from the S&amp;P 500 and NASDAQ 100 that meet basic SEPA
                fundamental criteria such as minimum EPS growth, revenue growth, price, and volume. These land
                in the Candidates page.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 2 — Automatic data population</p>
              <p>
                The screener populates what it can automatically: EPS growth, revenue growth, and company name.
                Technical fields like trend template, RS line, base pattern, entry zone, stop, and targets still
                require chart research.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 3 — Copy prompt + data</p>
              <p>
                Go to the Candidates page and click <strong>Copy prompt + data</strong>. This copies a pre-built
                ChatGPT research prompt plus the candidate JSON to your clipboard in one click.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 4 — Run research in ChatGPT</p>
              <p>
                Open ChatGPT, paste, and send. ChatGPT researches each candidate and fills in the missing fields.
                Stocks it cannot research or that fail quality checks are marked with grade <strong>F</strong>.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 5 — Bulk import the results</p>
              <p>
                Copy ChatGPT&apos;s JSON output. Go back to the Candidates page, paste into the import box, and
                click <strong>Apply</strong>. All candidates are updated in one operation. F-grade candidates are
                automatically removed.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 6 — Flow into watchlist evaluation</p>
              <p>
                Valid candidates flow into the next evening&apos;s watchlist-evaluate scan for full SEPA rule
                evaluation.
              </p>
            </div>
          </div>
        </Section>

        <Section title="6. How the Rule Engine Makes Decisions">
          <p>
            The engine is still rule-based. It does not simply “like” or “dislike” a stock. It checks specific
            conditions and then produces a verdict.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Term
              term="Pass"
              definition="The setup meets the hard requirements, soft conditions are acceptable, and no major risk flag changes the outcome."
            />
            <Term
              term="Watch"
              definition="The setup is not a clean reject, but enough caution exists that it should be monitored rather than acted on immediately."
            />
            <Term
              term="Fail"
              definition="A hard rule failed. The setup does not qualify and should not move forward into trade planning."
            />
          </div>

          <div className="space-y-4">
            <div>
              <p className="font-semibold">Hard fail rules — any one of these failing = verdict fail</p>
              <ul className="ml-5 list-disc space-y-2">
                <li>Market phase is correction or bear</li>
                <li>Trend template does not pass all 8 criteria</li>
                <li>Liquidity gate fails</li>
                <li>Base pattern is not valid</li>
                <li>RS line is not confirming</li>
                <li>Fundamentals fail (EPS growth under 25%, revenue growth under 25%, weak A/D rating, or industry rank outside the top 20%)</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold">Soft fail rules — two or more failing = verdict watch</p>
              <ul className="ml-5 list-disc space-y-2">
                <li>Volume dry-up not confirmed</li>
                <li>Entry not near pivot</li>
                <li>Volume breakout not confirmed</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold">Risk flags — upgrade pass to watch</p>
              <ul className="ml-5 list-disc space-y-2">
                <li>Earnings within 2 weeks</li>
                <li>Binary event risk</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section title="7. Trade Sizing">
          <p>
            Position sizing is still risk-based. The app calculates shares from your portfolio value, setup grade,
            entry, stop, and the current market environment. The goal is consistency, not conviction-based sizing.
          </p>

          <ul className="ml-5 list-disc space-y-2">
            <li>A+ setup: 2% portfolio risk</li>
            <li>A setup: 1% portfolio risk</li>
            <li>B setup: 0.5% portfolio risk</li>
            <li>C setup: 0.25% portfolio risk</li>
          </ul>

          <p>
            In an under-pressure market, risk is halved across all grades. If earnings risk or binary event risk
            is present, position size is halved again. Maximum single position remains capped at 25% of portfolio value.
          </p>
        </Section>

        <Section title="8. Core Terms You Need to Know">
          <div className="grid gap-4 md:grid-cols-2">
            <Term
              term="Market Phase"
              definition="The current overall market condition, such as confirmed uptrend, under pressure, rally attempt, correction, or bear market."
            />
            <Term
              term="Watchlist"
              definition="A list of candidate stocks you are monitoring. A watchlist is not a list of automatic buys."
            />
            <Term
              term="Setup Grade"
              definition="A quick quality label for the setup, such as A+, A, B, or C. Better grades usually deserve more attention and sometimes more risk allocation."
            />
            <Term
              term="Pivot"
              definition="The key breakout level where a stock is expected to move through resistance."
            />
            <Term
              term="Entry Zone"
              definition="The acceptable price range where the trade still makes sense. Buying too far above the entry zone can damage reward/risk."
            />
            <Term
              term="Stop Price"
              definition="The price where you exit to control the loss if the trade is wrong."
            />
            <Term
              term="Reward/Risk (R/R)"
              definition="How much upside you expect relative to how much downside you are risking."
            />
            <Term
              term="Position Size"
              definition="The number of shares to buy, calculated from your portfolio size, risk percentage, entry price, and stop."
            />
            <Term
              term="Portfolio Heat"
              definition="How much of your account is currently exposed across open positions."
            />
            <Term
              term="Partial Exit"
              definition="Selling part of a position while leaving the rest open."
            />
            <Term
              term="Rule Audit"
              definition="A detailed record of which rules passed or failed during setup evaluation."
            />
            <Term
              term="Weekly Review"
              definition="A structured reset process where you review market conditions, trade results, mistakes, and next-week focus."
            />
            <Term
              term="Pending action"
              definition="A signal or alert in your Inbox awaiting your confirmation."
            />
            <Term
              term="Signal state"
              definition="The lifecycle stage of a watchlist candidate — candidate, evaluated, plan generated, signal sent, awaiting confirmation, converted to trade, archived."
            />
            <Term
              term="Screener"
              definition="The nightly autonomous function that discovers new stock candidates from the S&P 500 and NASDAQ 100."
            />
            <Term
              term="Trade Instruction Card"
              definition="The email sent when a buy signal is generated — contains ticker, entry zone, stop, shares, position value, and reward/risk."
            />
            <Term
              term="Bulk import"
              definition="The one-click operation that applies ChatGPT research results to all candidates simultaneously."
            />
            <Term
              term="Scan log"
              definition="The internal record of every automated function run, used for debugging and audit."
            />
          </div>
        </Section>

        <Section title="9. Non-Negotiables">
          <ul className="ml-5 list-disc space-y-2">
            <li>Do not ignore market context — the system checks market phase before every evaluation.</li>
            <li>Do not create trades without a defined stop.</li>
            <li>Do not take trades with poor reward/risk — minimum 2:1 required.</li>
            <li>Do not oversize — position sizing is rule-based, not conviction-based.</li>
            <li>Do not skip the Inbox confirmation — every signal requires your explicit action.</li>
            <li>Do not act on a signal without checking the rule breakdown in the evaluation.</li>
            <li>Do not skip weekly review just because a trade made money.</li>
            <li>Do not let one trade define your week.</li>
          </ul>
        </Section>

        <Section title="10. Suggested Learning Path for a New User">
          <ol className="ml-5 list-decimal space-y-2">
            <li>Read through the Settings page and configure your portfolio value, notification email, and scan schedule.</li>
            <li>Add 2–3 stocks manually to the watchlist using the Dashboard form.</li>
            <li>Run a manual evaluation from the Dashboard to understand the rule breakdown.</li>
            <li>Enable the screener in Settings and check the Candidates page the next morning.</li>
            <li>Run the ChatGPT research workflow on your first batch of candidates.</li>
            <li>Wait for the first automated buy signal email and review it carefully before acting.</li>
            <li>Use Weekly Review every Sunday without exception.</li>
          </ol>
        </Section>
      </section>
    </main>
  )
}