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
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-neutral-700">
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
    <div className="rounded-xl border border-neutral-200 p-4">
      <p className="font-semibold text-neutral-900">{term}</p>
      <p className="mt-1 text-sm leading-6 text-neutral-700">{definition}</p>
    </div>
  )
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10 text-neutral-900">
      <section className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-500">
                Divya Swing Engine
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                Documentation & Learning Guide
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-600">
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
            This platform is a rule-based swing trading operating system. It helps you move through a disciplined workflow:
            read the market, build a watchlist, evaluate a setup, size the trade, execute the trade, manage the trade,
            and review results at the end of the week.
          </p>
          <p>
            The most important idea is this: <strong>the market comes first.</strong> You do not start by asking,
            “Which stock looks exciting?” You start by asking, “Is the overall market supportive for swing trading right now?”
          </p>
          <p>
            If the market is weak, even strong-looking individual stocks can fail. If the market is healthy, your odds improve.
          </p>
        </Section>

        <Section title="2. Step-by-Step: How To Use The App">
          <div className="space-y-5">
            <div>
              <p className="font-semibold">Step 1 — Update Market Snapshot</p>
              <p>
                Go to the market snapshot section on the dashboard and enter the current market phase and the maximum long exposure
                you want to allow. This sets the context for everything else.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 2 — Add a Stock to the Watchlist</p>
              <p>
                Enter the ticker, company name, setup grade, reward/risk ratio, entry zone, and stop. This creates a candidate
                idea, not a live trade.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 3 — Select the Watchlist Stock</p>
              <p>
                Choose the stock you want to evaluate. The selected stock becomes the active candidate for setup analysis and trade planning.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 4 — Evaluate Setup</p>
              <p>
                Click <strong>Evaluate Setup</strong>. The engine checks the setup against core rules such as market phase,
                trend template, volume pattern, and reward/risk. It returns a verdict: <strong>Pass</strong>, <strong>Watch</strong>, or <strong>Fail</strong>.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 5 — Review the Rule Breakdown</p>
              <p>
                Read the evaluation panel carefully. This shows why the stock passed, failed, or only qualified with caution.
                This is where you build trust in the engine.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 6 — Generate Trade Plan</p>
              <p>
                Enter your portfolio value and click <strong>Generate Trade Plan</strong>. The app calculates risk, position size,
                shares, and expected reward/risk using the current setup and your account size.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 7 — Create Trade</p>
              <p>
                If the trade plan is approved, click <strong>Create Trade</strong>. The trade becomes live and moves into trade management.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 8 — Manage the Trade</p>
              <p>
                Use the stop update section to move stops as the trade develops. Use the partial exit section if you want to reduce size
                without closing the full position. Use close trade when the trade is done.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 9 — Review Portfolio Heat</p>
              <p>
                Watch the portfolio heat section. This tells you how much of your portfolio is currently exposed and whether you are still
                within your market-based exposure limit.
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 10 — Complete Weekly Review</p>
              <p>
                At the end of the week, go to <strong>Weekly Review</strong>. Review open trades, closed trades, realized P&amp;L, mistakes,
                and your focus for next week.
              </p>
            </div>
          </div>
        </Section>

        <Section title="3. Beginner Workflow: What To Do in Real Life">
          <p className="font-semibold">If you are brand new, use this simple routine:</p>
          <ol className="ml-5 list-decimal space-y-2">
            <li>Update market phase first.</li>
            <li>Add only 1–3 watchlist names at first.</li>
            <li>Evaluate only the cleanest setup.</li>
            <li>Do not create a trade unless the engine verdict is clearly supportive.</li>
            <li>Keep position size small while learning.</li>
            <li>Review every trade in Weekly Review, even if it made money.</li>
          </ol>
          <p>
            The goal at the beginning is not to trade a lot. The goal is to learn the process and avoid sloppy decisions.
          </p>
        </Section>

        <Section title="4. How the Engine Makes Decisions">
          <p>
            The engine is rule-based. It does not simply “like” or “dislike” a stock. It checks specific conditions and then produces a verdict.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Term
              term="Pass"
              definition="The setup meets the main rule requirements and can move forward into trade planning."
            />
            <Term
              term="Watch"
              definition="The setup is not a clean reject, but there is caution. Examples: weaker grade, event risk, or not enough quality."
            />
            <Term
              term="Fail"
              definition="The setup breaks a hard rule. Examples: weak market phase, failed trend template, or reward/risk below minimum."
            />
          </div>

          <p>
            The point of the rule engine is consistency. A trader improves faster when decisions are explained and repeatable.
          </p>
        </Section>

        <Section title="5. The Most Important Rules in This Platform">
          <ul className="ml-5 list-disc space-y-2">
            <li>The overall market is checked before individual stock analysis.</li>
            <li>The setup must have a logical stop.</li>
            <li>The setup must have acceptable reward/risk.</li>
            <li>Position size is based on risk, not emotion or conviction.</li>
            <li>Portfolio exposure should stay within market-based limits.</li>
            <li>Losses must stay controlled and review must be routine.</li>
          </ul>
        </Section>

        <Section title="6. Core Terms You Need to Know">
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
          </div>
        </Section>

        <Section title="7. How To Read the Main Dashboard">
          <div className="space-y-4">
            <div>
              <p className="font-semibold">Dashboard Metrics</p>
              <p>
                Gives you a high-level snapshot: watchlist count, open trades, closed trades, and realized P&amp;L.
              </p>
            </div>

            <div>
              <p className="font-semibold">Portfolio Heat</p>
              <p>
                Shows whether your current open position exposure is still within the maximum exposure allowed by the market environment.
              </p>
            </div>

            <div>
              <p className="font-semibold">Market Summary</p>
              <p>
                Shows the current market phase, selected candidate, and portfolio value being used for sizing.
              </p>
            </div>

            <div>
              <p className="font-semibold">Watchlist Selection</p>
              <p>
                Lets you choose which stock the engine should analyze next.
              </p>
            </div>

            <div>
              <p className="font-semibold">Evaluation Panel</p>
              <p>
                Shows the verdict, decision reason, and full rule breakdown.
              </p>
            </div>

            <div>
              <p className="font-semibold">Trade Plan Panel</p>
              <p>
                Shows risk %, dollar risk, entry, stop, shares, and expected reward/risk.
              </p>
            </div>

            <div>
              <p className="font-semibold">Trade Management</p>
              <p>
                Lets you close trades, update stops, and process partial exits.
              </p>
            </div>
          </div>
        </Section>

        <Section title="8. How To Use Weekly Review Properly">
          <p>
            Weekly review is not just a report. It is a reset ritual.
          </p>
          <ol className="ml-5 list-decimal space-y-2">
            <li>Check current market phase first.</li>
            <li>Review all open trades.</li>
            <li>Review every closed trade.</li>
            <li>Count wins and losses.</li>
            <li>Look for rule violations and execution mistakes.</li>
            <li>Write one clear focus for next week.</li>
          </ol>
          <p>
            A trader improves by reviewing behavior, not by staring at P&amp;L alone.
          </p>
        </Section>

        <Section title="9. Non-Negotiables">
          <ul className="ml-5 list-disc space-y-2">
            <li>Do not ignore market context.</li>
            <li>Do not create trades without a defined stop.</li>
            <li>Do not take trades with poor reward/risk.</li>
            <li>Do not oversize because of confidence or excitement.</li>
            <li>Do not skip review just because a trade made money.</li>
            <li>Do not let one trade define your week.</li>
          </ul>
        </Section>

        <Section title="10. Suggested Learning Path for a New User">
          <ol className="ml-5 list-decimal space-y-2">
            <li>Learn the meanings of market phase, pivot, stop, and reward/risk.</li>
            <li>Practice adding watchlist names without creating trades.</li>
            <li>Run evaluations and read the rule breakdown carefully.</li>
            <li>Generate trade plans using small sample portfolio values.</li>
            <li>Paper trade a few examples before using real money decisions.</li>
            <li>Use Weekly Review every single week.</li>
          </ol>
        </Section>
      </section>
    </main>
  )
}