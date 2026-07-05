import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const PROTECTED = ['/dashboard', '/profile', '/admin', '/merchandise/sell', '/merchandise/my-listings']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  if (isProtected && !req.auth) {
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url))
  }

  // Restrict /admin routes to ADMIN role only
  if (pathname.startsWith('/admin')) {
    // `req.auth` typings vary; safely read role from either `user` or `token`
    const authAny = req.auth as any
    const role = authAny?.user?.role || authAny?.token?.role
    if (role !== 'ADMIN') {
      // If unauthenticated, redirect to login (handled above). If authenticated but not admin, send to home.
      return NextResponse.redirect(new URL('/', req.url))
    }
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
