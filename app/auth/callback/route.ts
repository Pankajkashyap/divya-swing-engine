import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/app/trading/lib/supabase-server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const allowedEmail = (process.env.AUTHORIZED_EMAIL ?? '')
    .trim()
    .toLowerCase()

  const userEmail = (user?.email ?? '').trim().toLowerCase()

  if (!allowedEmail || !userEmail || userEmail !== allowedEmail) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin))
}