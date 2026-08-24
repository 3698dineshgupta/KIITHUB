import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { approveSubmission, rejectSubmission } from '@/lib/submission-moderation'

// Web-panel counterpart to the Telegram Approve/Reject buttons — both call
// the exact same lib/submission-moderation.ts functions, so approving here
// also edits the original Telegram message to show the decision, keeping
// both review channels in sync regardless of which one an admin used.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'MODERATOR')) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
    }

    const body = await req.json()
    const { action, reason } = body as { action?: 'approve' | 'reject'; reason?: string }

    if (action === 'approve') {
      const result = await approveSubmission(id, admin.id)
      if (!result.ok) return NextResponse.json({ success: false, error: result.error, code: 400 }, { status: 400 })
      return NextResponse.json({ success: true, submission: result.submission, rewardGranted: result.rewardGranted })
    }

    if (action === 'reject') {
      if (!reason || !reason.trim()) return NextResponse.json({ success: false, error: 'A rejection reason is required', code: 400 }, { status: 400 })
      const result = await rejectSubmission(id, admin.id, reason.trim())
      if (!result.ok) return NextResponse.json({ success: false, error: result.error, code: 400 }, { status: 400 })
      return NextResponse.json({ success: true, submission: result.submission })
    }

    return NextResponse.json({ success: false, error: 'Invalid action', code: 400 }, { status: 400 })
  } catch (err) {
    console.error('admin/submissions PATCH error:', err)
    return NextResponse.json({ success: false, error: 'Failed to update submission', code: 500 }, { status: 500 })
  }
}
