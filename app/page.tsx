export default function HomePage() {
  return (
    <main className="ui-page">
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl flex-col justify-center">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
            Vyana
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-5xl">
            Trading + Investing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-400 sm:text-base">
            Two distinct workflows, one platform. Trading is for tactical swing execution.
            Investing will be the long-horizon research and portfolio module.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <a
            href="/trading"
            className="group rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
          >
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              Divya Trading
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              Setup evaluation, watchlist management, market snapshots, trade plans,
              trade execution, and weekly review.
            </p>
            <div className="mt-6 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Open Trading →
            </div>
          </a>

          <a
            href="/investing"
            className="group rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm transition hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
          >
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              Shayna Investing
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              Long-term investing workspace. Module scaffold only for now; implementation
              comes after trading refactor is fully verified.
            </p>
            <div className="mt-6 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Open Investing →
            </div>
          </a>
        </div>
      </section>
    </main>
  )
}