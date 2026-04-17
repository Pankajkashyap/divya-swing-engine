'use client'

import { AppHeader } from '@/app/trading/components/AppHeader'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'

function SectionBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-sm leading-7 text-neutral-700 dark:text-[#c7d0db]">
      {children}
    </div>
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
    <div className="ui-card p-4">
      <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">{term}</p>
      <p className="mt-1 text-sm leading-6 text-neutral-700 dark:text-[#c7d0db]">
        {definition}
      </p>
    </div>
  )
}

export default function DocsPage() {
  return (
    <main className="ui-page">
      <section className="mx-auto max-w-7xl space-y-4">
        <AppHeader title="Documentation & Learning Guide" />

        <CollapsibleSection
          title="1. Start here"
          subtitle="What the platform does and how it fits into your workflow."
          defaultOpen={true}
        >
          <SectionBody>
            <p>
              This platform is now an autonomous swing trading assistant, not just a
              manual planning tool. It runs on a schedule in the background and
              continuously scans the market, evaluates watchlist stocks, generates
              trade plans, and monitors open trades without you having to trigger each
              step manually.
            </p>
            <p>
              The system sends you email notifications when action is required. If a
              qualifying buy setup is found, you receive a trade instruction email. If
              an open trade hits a stop or reaches a target, you receive an urgent
              alert. At the end of the day and week, you receive digest emails
              summarising what happened.
            </p>
            <p>
              The most important design principle is <strong>human in the loop</strong>.
              The system never places orders for you. All execution happens manually in
              Wealthsimple. Every buy and every sell still requires your explicit
              confirmation.
            </p>
            <p>
              The <strong>Inbox</strong> is the centre of that confirmation layer. This
              is where you review pending actions, confirm signals after acting in
              Wealthsimple, dismiss items you do not want to take, or snooze items you
              want to revisit later.
            </p>
            <p>
              The platform also includes a Universe page for managing the ticker
              universe the screener draws from, and a Candidates page for running
              ChatGPT-powered research on screener discoveries. Dark mode is supported
              throughout and can be toggled from the header or Settings page.
            </p>
          </SectionBody>
        </CollapsibleSection>

        <CollapsibleSection
          title="2. Daily routine"
          subtitle="What to do in the morning, afternoon, evening, and on Sundays."
          defaultOpen={false}
        >
          <SectionBody>
            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Morning (Mon-Fri)
              </p>
              <p>
                The trade monitor runs at 6:30 AM MT. If an open trade hit its stop
                at the open, an urgent alert email arrives. Check your email first.
                If stopped out, exit in Wealthsimple, then confirm in the Inbox.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Afternoon — 3:30 PM MT (Sun-Thu)
              </p>
              <p>
                The main evening scan sequence begins: 3:30 PM — Market scan updates
                SPY price data. 3:35 PM — Watchlist evaluate scores all watchlist
                stocks. 3:40 PM — Daily digest email arrives in your inbox. Review
                the digest. If buy signals fired, open the Inbox to review the Trade
                Instruction Card and place a pre-market limit order in Wealthsimple
                before 9:30 AM next morning.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Evening — 9:00 PM MT (Sun-Thu)
              </p>
              <p>
                The screener runs and discovers new candidates from the S&amp;P 500
                and NASDAQ 100 universe. At approximately 9:05 PM you receive a
                Screener Complete email telling you how many new candidates were
                added and linking directly to the Candidates page.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Evening — 9:05-9:30 PM MT (when candidates exist)
              </p>
              <p>
                Open the Candidates page. Click Copy prompt + data. Paste into
                ChatGPT with web browsing and extended thinking enabled. Paste the
                result back and click Apply. Researched candidates will be evaluated
                the next afternoon at 3:35 PM MT.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Sunday evening
              </p>
              <p>
                At 5:00 PM MT the weekly digest email arrives covering your
                performance for the week. Complete your Weekly Review in the app.
                Update the market snapshot using the ChatGPT market prompt on the
                Dashboard — this sets the phase for the entire coming week.
              </p>
            </div>
          </SectionBody>
        </CollapsibleSection>

        <CollapsibleSection
          title="3. The pages"
          subtitle="What each main area of the trading app is for."
          defaultOpen={false}
        >
          <SectionBody>
            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Dashboard
              </p>
              <p>
                The main trading workspace. Add and manage watchlist stocks, run
                manual evaluations, generate trade plans, and manage open trades.
                Also contains the Market Snapshot ChatGPT workflow — a copy-paste
                prompt that lets ChatGPT research the current market and return a
                structured JSON to set the market phase and maximum exposure for the
                week.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Inbox
              </p>
              <p>
                The action centre. All buy signals, stop alerts, target alerts, and
                watchlist review items appear here sorted by urgency. Every
                automated signal requires your confirmation before anything happens.
                Watchlist removal proposals also appear here when the system
                identifies automation-sourced candidates that fall below your
                screener minimums.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Candidates
              </p>
              <p>
                The screener research hub. Stocks discovered by the autonomous
                screener appear here awaiting technical research. A log icon on each
                row opens the full history of that ticker — when it was added, what
                screener metrics it passed, all evaluations run, and any trade plans
                generated.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Universe
              </p>
              <p>
                Manage the ticker universe the screener draws from. Uses a two-step
                workflow: Step 1 syncs the S&amp;P 500 from a community-maintained
                GitHub dataset with one click. Step 2 generates a ChatGPT audit
                prompt that checks the list for recent acquisitions, delistings, and
                ticker changes. The NASDAQ 100 is managed separately via a manual
                ChatGPT prompt. Update quarterly after each index rebalance.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Weekly Review
              </p>
              <p>
                Your end-of-week reset. Review closed trades, wins, losses, realized
                P&amp;L, rule violations, and write your focus for next week.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Docs
              </p>
              <p>This page.</p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Settings
              </p>
              <p>
                Control your portfolio value, notification email, timezone, scan
                schedule, buy signal expiry, morning trade monitor toggle, screener
                preferences, and appearance.
              </p>
            </div>
          </SectionBody>
        </CollapsibleSection>

        <CollapsibleSection
          title="4. How the autonomous system works"
          subtitle="The scheduled jobs that power the daily operating rhythm."
          defaultOpen={false}
        >
          <SectionBody>
            <p>
              The automation layer is powered by scheduled Edge Functions running
              through Supabase pg_cron. Each function has a narrow job. Together they
              create the daily operating rhythm of the app.
            </p>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                market-scan
              </p>
              <p>
                Runs at 6:30 AM, 10:30 AM, and 3:30 PM MT. Updates SPY price data.
                Never overwrites a manually set market phase — that is set via the
                ChatGPT market snapshot workflow on the Dashboard.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                watchlist-evaluate
              </p>
              <p>
                Re-evaluates every watchlist stock against SEPA rules using live
                market data.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                trade-monitor
              </p>
              <p>
                Checks current prices for all open trades against stops and targets.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                fundamentals-refresh
              </p>
              <p>
                Refreshes EPS and revenue data for watchlist stocks.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                watchlist-review
              </p>
              <p>
                Flags stocks that have failed rules three or more consecutive times
                AND proposes removal of automation-sourced candidates that fall below
                your current screener minimum settings.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                watchlist-screener
              </p>
              <p>
                Runs nightly at 9:00 PM MT. Discovers new candidates from the
                S&amp;P 500 and NASDAQ 100 universe.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                daily-digest
              </p>
              <p>Sends a summary email at 3:40 PM MT.</p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                weekly-digest
              </p>
              <p>Sends a performance summary email on Sunday at 5:00 PM MT.</p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                expire-pending-actions
              </p>
              <p>Cleans up stale buy signals from the Inbox.</p>
            </div>
          </SectionBody>
        </CollapsibleSection>

        <CollapsibleSection
          title="5. The ChatGPT workflows"
          subtitle="How to use ChatGPT for market snapshots, candidate research, and universe updates."
          defaultOpen={false}
        >
          <SectionBody>
            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Workflow 1 — Market Snapshot (weekly)
              </p>
              <p>
                Every Sunday evening, go to the Dashboard and use the market
                snapshot panel. Copy the prompt, paste into ChatGPT with web
                browsing and extended thinking enabled, paste the JSON result back,
                and click Apply.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Workflow 2 — Candidate Research (nightly, after screener)
              </p>
              <p>
                Go to the Candidates page and click <strong>Copy prompt + data</strong>.
                Paste into ChatGPT, let it research the missing fields, then paste
                the JSON output back and click <strong>Apply</strong>.
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900 dark:text-[#e6eaf0]">
                Workflow 3 — Universe Sync (quarterly)
              </p>
              <p>
                Use the Universe page to sync the S&amp;P 500 from GitHub, then run
                the ChatGPT audit prompt to catch recent acquisitions, delistings,
                and ticker changes.
              </p>
            </div>
          </SectionBody>
        </CollapsibleSection>

        <CollapsibleSection
          title="6. How the rule engine makes decisions"
          subtitle="Pass, Watch, and Fail outcomes."
          defaultOpen={false}
        >
          <SectionBody>
            <p>
              The engine is rule-based. It checks specific conditions and then
              produces a verdict.
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
          </SectionBody>
        </CollapsibleSection>

        <CollapsibleSection
          title="7. Trade sizing"
          subtitle="How position size is calculated."
          defaultOpen={false}
        >
          <SectionBody>
            <p>
              Position sizing is risk-based. The app calculates shares from your
              portfolio value, setup grade, entry, stop, and the current market
              environment.
            </p>

            <ul className="ml-5 list-disc space-y-2">
              <li>A+ setup: 2% portfolio risk</li>
              <li>A setup: 1% portfolio risk</li>
              <li>B setup: 0.5% portfolio risk</li>
              <li>C setup: 0.25% portfolio risk</li>
            </ul>

            <p>
              In an under-pressure market, risk is halved across all grades. If
              earnings risk or binary event risk is present, position size is halved
              again. Maximum single position remains capped at 25% of portfolio
              value.
            </p>
          </SectionBody>
        </CollapsibleSection>

        <CollapsibleSection
          title="8. Core terms"
          subtitle="Important terms used throughout the platform."
          defaultOpen={false}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Term
              term="Market Phase"
              definition="The current overall market condition, such as confirmed uptrend, under pressure, rally attempt, correction, or bear market."
            />
            <Term
              term="Market Snapshot"
              definition="A weekly record of the current market phase and maximum long exposure percentage."
            />
            <Term
              term="Ticker Universe"
              definition="The pool of stocks the screener randomly samples from each night."
            />
            <Term
              term="Watchlist"
              definition="A list of candidate stocks you are monitoring."
            />
            <Term
              term="Screener Audit Trail"
              definition="A complete log of every ticker the screener evaluated — passed and rejected."
            />
            <Term
              term="Watchlist Removal Proposal"
              definition="An Inbox action created when an automation-sourced candidate falls below your screener minimums."
            />
            <Term
              term="Setup Grade"
              definition="A quick quality label for the setup, such as A+, A, B, or C."
            />
            <Term
              term="Pivot"
              definition="The key breakout level where a stock is expected to move through resistance."
            />
            <Term
              term="Entry Zone"
              definition="The acceptable price range where the trade still makes sense."
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
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="9. Non-negotiables"
          subtitle="The core discipline rules."
          defaultOpen={false}
        >
          <SectionBody>
            <ul className="ml-5 list-disc space-y-2">
              <li>Do not ignore market context.</li>
              <li>Do not create trades without a defined stop.</li>
              <li>Do not take trades with poor reward/risk.</li>
              <li>Do not oversize positions.</li>
              <li>Do not skip Inbox confirmation.</li>
              <li>Do not skip weekly review.</li>
            </ul>
          </SectionBody>
        </CollapsibleSection>

        <CollapsibleSection
          title="10. Suggested learning path"
          subtitle="How a new user should get started."
          defaultOpen={false}
        >
          <SectionBody>
            <ol className="ml-5 list-decimal space-y-2">
              <li>Sign in with Google or magic link.</li>
              <li>Go to Settings and set portfolio value, notification email, and timezone.</li>
              <li>Go to Universe and sync the ticker universe.</li>
              <li>Go to Dashboard and run the market snapshot ChatGPT workflow.</li>
              <li>Wait for the screener to run or add a few stocks manually.</li>
              <li>Use Candidates to run the ChatGPT research workflow.</li>
              <li>Review the daily digest email for results.</li>
              <li>If a buy signal fires, review it in the Inbox and place the order manually.</li>
              <li>Use Weekly Review every Sunday evening.</li>
            </ol>
          </SectionBody>
        </CollapsibleSection>

        <CollapsibleSection
          title="11. Schedule reference"
          subtitle="The main recurring jobs and their purpose."
          defaultOpen={false}
        >
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Time (MT)</th>
                  <th>Days</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Market scan (morning)</td>
                  <td>6:30 AM</td>
                  <td>Mon-Fri</td>
                  <td>SPY price update</td>
                </tr>
                <tr>
                  <td>Trade monitor (morning)</td>
                  <td>6:30 AM</td>
                  <td>Mon-Fri</td>
                  <td>Stop/target check</td>
                </tr>
                <tr>
                  <td>Watchlist evaluate</td>
                  <td>6:35 AM</td>
                  <td>Mon-Fri</td>
                  <td>Morning rule eval</td>
                </tr>
                <tr>
                  <td>Market scan (midday)</td>
                  <td>10:30 AM</td>
                  <td>Mon-Fri</td>
                  <td>SPY price update</td>
                </tr>
                <tr>
                  <td>Trade monitor (midday)</td>
                  <td>10:30 AM</td>
                  <td>Mon-Fri</td>
                  <td>Stop/target check</td>
                </tr>
                <tr>
                  <td>Market scan (evening)</td>
                  <td>3:30 PM</td>
                  <td>Sun-Thu</td>
                  <td>SPY price update</td>
                </tr>
                <tr>
                  <td>Watchlist evaluate</td>
                  <td>3:35 PM</td>
                  <td>Sun-Thu</td>
                  <td>Evening rule eval</td>
                </tr>
                <tr>
                  <td>Daily digest email</td>
                  <td>3:40 PM</td>
                  <td>Sun-Thu</td>
                  <td>Summary email</td>
                </tr>
                <tr>
                  <td>Weekly digest email</td>
                  <td>5:00 PM</td>
                  <td>Sunday</td>
                  <td>Weekly summary</td>
                </tr>
                <tr>
                  <td>Watchlist screener</td>
                  <td>9:00 PM</td>
                  <td>Sun-Thu</td>
                  <td>Find candidates</td>
                </tr>
                <tr>
                  <td>Screener notification</td>
                  <td>~9:05 PM</td>
                  <td>Sun-Thu</td>
                  <td>Candidates ready email</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      </section>
    </main>
  )
}