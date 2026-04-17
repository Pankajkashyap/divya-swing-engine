import type { Metadata } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Divya Platform',
  description: 'Trading + Investing platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm font-semibold tracking-[0.18em] uppercase text-neutral-900 dark:text-neutral-100"
                >
                  Divya Platform
                </Link>

                <nav className="flex items-center gap-2">
                  <Link href="/trading" className="ui-link-pill-idle">
                    Trading
                  </Link>
                  <Link href="/investing" className="ui-link-pill-idle">
                    Investing
                  </Link>
                </nav>
              </div>

              <ThemeToggle />
            </div>
          </header>

          <div className="flex-1">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  )
}