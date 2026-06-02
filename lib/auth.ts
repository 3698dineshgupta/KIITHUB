import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
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
        // Validate active session
        const activeSessionId = await cache.get(`user:session:${token.id}`)
        if (activeSessionId && activeSessionId !== token.sessionId) {
          return {} // Invalidate token instantly
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
      if (token && session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).membershipStatus = token.membershipStatus
        ;(session.user as any).membershipExpiry = token.membershipExpiry
      }
      return session
    },
  },
})
