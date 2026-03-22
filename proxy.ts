import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase-server'

const AUTHORIZED_EMAIL = 'pnkjkshp80@gmail.com'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  const supabase = createSupabaseMiddlewareClient(request, response)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isLoginRoute = pathname === '/login'
  const isAuthCallbackRoute = pathname === '/auth/callback'

  if (user?.email && user.email.toLowerCase() !== AUTHORIZED_EMAIL.toLowerCase()) {
    await supabase.auth.signOut()

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (!user && !isLoginRoute && !isAuthCallbackRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (user && isLoginRoute) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    return NextResponse.redirect(homeUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}