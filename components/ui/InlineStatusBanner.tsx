'use client'

type Props = {
  tone?: 'success' | 'error' | 'info'
  message: string | null | undefined
}

function getToneClasses(tone: NonNullable<Props['tone']>) {
  switch (tone) {
    case 'success':
      return 'border border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300'
    case 'error':
      return 'border border-red-200 text-red-700 dark:border-red-900 dark:text-[#f0a3a3]'
    case 'info':
    default:
      return 'border border-blue-200 text-blue-700 dark:border-blue-900 dark:text-blue-300'
  }
}

export function InlineStatusBanner({
  tone = 'info',
  message,
}: Props) {
  if (!message) return null

  return (
    <div className={`ui-card p-4 text-sm ${getToneClasses(tone)}`}>
      {message}
    </div>
  )
}