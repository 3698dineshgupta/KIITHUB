import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { approveListing, rejectListing } from '@/lib/merch-moderation'

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
    if (action === 'reject' && !reason) {
      return NextResponse.json({ success: false, error: 'Rejection reason is required', code: 400 }, { status: 400 })
    }

    const result = action === 'approve'
      ? await approveListing(id, admin.id)
      : await rejectListing(id, admin.id, reason)

    if (!result.ok) return NextResponse.json({ success: false, error: result.error, code: 400 }, { status: 400 })

    return NextResponse.json({ success: true, listing: result.listing })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('admin/merchandise PATCH error:', err)
    return NextResponse.json({ success: false, error: 'Failed to update listing', code: 500 }, { status: 500 })
  }
}
