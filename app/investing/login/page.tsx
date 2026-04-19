'use client'

import { FormEvent, useMemo, useState } from 'react'
import { createInvestingSupabaseBrowserClient } from '@/app/investing/lib/supabase'

const INVESTING_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://divya-swing-engine.vercel.app'

export default function InvestingLoginPage() {
  const supabase = useMemo(() => createInvestingSupabaseBrowserClient(), [])

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const redirectTo = `${INVESTING_APP_URL}/auth/callback`

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) {
        setErrorMessage(error.message)
      }
    } catch {
      setErrorMessage('Failed to sign in with Google. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <main className="ui-page">
      <section className="mx-auto max-w-md ui-section">
        <div className="ui-card p-8">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-neutral-500 dark:text-[#a8b2bf]">
              Shayna Investing
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-[#e6eaf0]">
              Login
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-[#a8b2bf]">
              Sign in with Google or use a magic link sent to your email.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3a4150] dark:bg-[#1e2330] dark:text-[#c7d0db] dark:hover:bg-[#252c3a]"
          >
            {googleLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-[#3a4150]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-neutral-500 dark:bg-[#1a1f2e] dark:text-[#a8b2bf]">
                or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-neutral-700 dark:text-[#c7d0db]"
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
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-[#5a2d33] dark:bg-[#3a2227] dark:text-[#f0a3a3]">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-[#2f5a43] dark:bg-[#1f3329] dark:text-[#8fd0ab]">
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