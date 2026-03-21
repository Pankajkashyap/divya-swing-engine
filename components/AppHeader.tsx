import Link from 'next/link'

type Props = {
  title: string
  subtitle?: string
  rightLinkHref?: string
  rightLinkLabel?: string
}

export function AppHeader({
  title,
  subtitle,
  rightLinkHref,
  rightLinkLabel,
}: Props) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          Divya Swing Engine
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
        ) : null}
      </div>

      {rightLinkHref && rightLinkLabel ? (
        <Link
          href={rightLinkHref}
          className="rounded-xl border border-neutral-900 px-4 py-2 text-sm font-medium"
        >
          {rightLinkLabel}
        </Link>
      ) : null}
    </div>
  )
}