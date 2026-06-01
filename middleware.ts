import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const PROTECTED = ['/dashboard', '/profile', '/admin']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  if (isProtected && !req.auth) {
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
