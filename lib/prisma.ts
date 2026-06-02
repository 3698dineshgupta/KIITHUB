import { PrismaClient } from '@prisma/client'
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing – required for Prisma')
}
const g = globalThis as unknown as { prisma: PrismaClient | undefined }
export const prisma = g.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'] })
if (process.env.NODE_ENV !== 'production') g.prisma = prisma
