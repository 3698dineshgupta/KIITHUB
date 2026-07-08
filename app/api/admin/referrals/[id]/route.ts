import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAndGrantMilestone } from '@/lib/referral'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'MODERATOR')) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
    }

    const { action, reason } = await req.json()
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ success: false, error: 'Invalid action', code: 400 }, { status: 400 })
    }

    const referral = await prisma.referral.findUnique({ where: { id } })
    if (!referral) return NextResponse.json({ success: false, error: 'Referral not found', code: 404 }, { status: 404 })

    const updated = await prisma.referral.update({
      where: { id },
      data: action === 'approve'
        ? { status: 'VALID', invalidReason: null, validatedAt: new Date() }
        : { status: 'INVALID', invalidReason: reason || 'Rejected by admin' },
    })

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: action === 'approve' ? 'REFERRAL_MANUAL_APPROVE' : 'REFERRAL_MANUAL_REJECT',
        resource: 'referral',
        resourceId: id,
        metadata: { reason: reason ?? null },
      },
    })

    if (action === 'approve') {
      await checkAndGrantMilestone(referral.referrerId)
    }

    return NextResponse.json({ success: true, referral: updated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('admin/referrals PATCH error:', err)
    return NextResponse.json({ success: false, error: 'Failed to update referral', code: 500 }, { status: 500 })
  }
}
