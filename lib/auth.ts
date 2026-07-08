import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { cookies, headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/redis'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          membershipStatus: user.membershipStatus,
          membershipExpiry: user.membershipExpiry,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.membershipStatus = (user as any).membershipStatus
        token.membershipExpiry = (user as any).membershipExpiry
        
        // Single login enforcement
        const sessionId = crypto.randomUUID()
        token.sessionId = sessionId
        await cache.set(`user:session:${user.id}`, sessionId, 60 * 60 * 24 * 30)
      } else if (token.id && token.sessionId) {
        // Validate active session - throttled to at most once every 5 minutes to prevent blocking page transitions on slow Redis queries
        const lastChecked = token.lastChecked as number | undefined
        const now = Date.now()
        if (!lastChecked || now - lastChecked > 300000) {
          const activeSessionId = await cache.get<string>(`user:session:${token.id}`)
          if (activeSessionId && activeSessionId !== token.sessionId) {
            return {} // Invalidate token instantly
          }
          token.lastChecked = now
        }
      }
      // Refresh user data on session update
      if (trigger === 'update' && token.id) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } })
        if (dbUser) {
          token.role = dbUser.role
          token.membershipStatus = dbUser.membershipStatus
          token.membershipExpiry = dbUser.membershipExpiry
        }
      }
      return token
    },
    async session({ session, token }) {
      // If token has been invalidated (e.g. second login evicted it), return empty session
      if (!token?.id) {
        return {} as any
      }
      if (token && session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).membershipStatus = token.membershipStatus
        ;(session.user as any).membershipExpiry = token.membershipExpiry
      }
      return session
    },
  },
  events: {
    // Fires once, only for brand-new accounts created by the PrismaAdapter —
    // i.e. Google sign-in. Credentials registration creates its own user row
    // directly in app/api/auth/register/route.ts and never hits this path.
    async createUser({ user }) {
      try {
        // Dynamically imported: this whole module (and its Prisma-heavy
        // transitive imports) is only ever needed here, inside a Node.js-
        // runtime event handler — lib/auth.ts itself is also bundled into
        // middleware.ts, which runs on the Edge Runtime on nearly every
        // request, so a static top-level import here would bloat every
        // single request's middleware bundle with code the edge path never
        // executes.
        const { generateUniqueReferralCode, creditReferral } = await import('@/lib/referral')
        const referralCode = await generateUniqueReferralCode()
        await prisma.user.update({ where: { id: user.id }, data: { referralCode } })

        // The register page stashes ?ref=CODE in a cookie before redirecting
        // to Google, since the OAuth round trip doesn't preserve query params.
        const cookieStore = await cookies()
        const ref = cookieStore.get('kiithub_ref')?.value
        if (ref && user.id) {
          const forwardedFor = (await headers()).get('x-forwarded-for')
          const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : null
          await creditReferral({ newUserId: user.id, referralCode: ref.toUpperCase(), ipAddress })
        }
      } catch (err) {
        // Referral bookkeeping must never break account creation.
        console.error('events.createUser referral handling failed:', err)
      }
    },
  },
})
