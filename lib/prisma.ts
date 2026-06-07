import { PrismaClient } from '@prisma/client'

const REQUIRED_ENV = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
]

const missing = REQUIRED_ENV.filter(key => !process.env[key])

if (!process.env.TELEGRAM_CHAT_ID && !process.env.TELEGRAM_CHANNEL_ID) {
  missing.push('TELEGRAM_CHAT_ID / TELEGRAM_CHANNEL_ID')
}

if (missing.length > 0) {
  const errorMsg = `\n================================================================\n❌ CRITICAL STARTUP ERROR: MISSING ENVIRONMENT VARIABLES\n================================================================\nThe following required variables are missing from your configuration:\n\n${missing.map(m => ` - ${m}`).join('\n')}\n\nPlease check your .env or .env.local file and restart the server.\n================================================================\n`
  console.error(errorMsg)
  throw new Error(`Missing environment variables: ${missing.join(', ')}`)
}

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient
}

const globalForPrisma = globalThis as GlobalWithPrisma

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}