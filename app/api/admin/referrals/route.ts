import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRequiredReferralCount } from '@/lib/referral'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'MODERATOR')) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
    }

    const [referrals, statusCounts, rewardsIssued, requiredCount] = await Promise.all([
      prisma.referral.findMany({
        include: {
          referrer: { select: { id: true, name: true, email: true } },
          referred: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
      prisma.referral.groupBy({ by: ['status'], _count: true }),
      prisma.referralReward.count(),
      getRequiredReferralCount(),
    ])

    const countFor = (status: 'VALID' | 'PENDING' | 'INVALID') => statusCounts.find(s => s.status === status)?._count ?? 0
    const valid = countFor('VALID')
    const pending = countFor('PENDING')
    const invalid = countFor('INVALID')

    return NextResponse.json({
      success: true,
      referrals,
      summary: { total: valid + pending + invalid, valid, pending, invalid, rewardsIssued, requiredCount },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('admin/referrals GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load referrals', code: 500 }, { status: 500 })
  }
}
