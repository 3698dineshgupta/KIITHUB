import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BUG_STATUSES } from '@/lib/bugs'
import { notifyBugReportStatusChanged } from '@/lib/bug-notify'

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
    const { status, priority, internalNotes } = body as { status?: string; priority?: number; internalNotes?: string }

    if (status && !BUG_STATUSES.includes(status as never)) {
      return NextResponse.json({ success: false, error: 'Invalid status', code: 400 }, { status: 400 })
    }

    const existing = await prisma.bugReport.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found', code: 404 }, { status: 404 })

    const report = await prisma.bugReport.update({
      where: { id },
      data: {
        ...(status ? { status: status as never } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(internalNotes !== undefined ? { internalNotes } : {}),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'BUG_REPORT_STATUS_CHANGED',
        resource: 'bug_report',
        resourceId: id,
        metadata: { status: status ?? existing.status, priority: priority ?? existing.priority },
      },
    })

    if (status && status !== existing.status && report.userId) {
      await notifyBugReportStatusChanged(report.userId, report.bugId, status).catch(() => {})
    }

    return NextResponse.json({ success: true, report })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('admin/bugs PATCH error:', err)
    return NextResponse.json({ success: false, error: 'Failed to update report', code: 500 }, { status: 500 })
  }
}
