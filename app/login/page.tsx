'use client'

import { FormEvent, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { appConfig } from '@/lib/config'

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage(null)
    setSuccessMessage(null)

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setErrorMessage('Please enter your email address.')
      return
    }

    setLoading(true)

    try {
      const redirectTo = `${appConfig.appUrl}/auth/callback`

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      setSuccessMessage('Check your email for a login link.')
    } catch {
      setErrorMessage('Failed to send magic link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <section className="mx-auto max-w-md ui-section">
        <div className="ui-card p-8">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-500 dark:text-neutral-400">
              Divya Swing Engine
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Login
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Enter your email to receive a magic login link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="ui-input w-full"
                autoComplete="email"
                autoFocus
              />
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="ui-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}