import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { REQUEST_STATUSES } from '@/lib/requests'
import { notifyRequestStatusChanged } from '@/lib/request-notify'
import { sendRequestUpdateEmail } from '@/lib/mail'
import { SITE_URL } from '@/components/seo/json-ld'

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
    const { status, adminResponse, fulfilledUrl } = body as { status?: string; adminResponse?: string; fulfilledUrl?: string }

    if (status && !REQUEST_STATUSES.includes(status as never)) {
      return NextResponse.json({ success: false, error: 'Invalid status', code: 400 }, { status: 400 })
    }

    const existing = await prisma.contentRequest.findUnique({ where: { id }, include: { user: true } })
    if (!existing) return NextResponse.json({ success: false, error: 'Not found', code: 404 }, { status: 404 })

    const request = await prisma.contentRequest.update({
      where: { id },
      data: {
        ...(status ? { status: status as never } : {}),
        ...(adminResponse !== undefined ? { adminResponse } : {}),
        ...(fulfilledUrl !== undefined ? { fulfilledUrl } : {}),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'REQUEST_STATUS_CHANGED',
        resource: 'content_request',
        resourceId: id,
        metadata: { status: status ?? existing.status },
      },
    })

    if (status && status !== existing.status) {
      await notifyRequestStatusChanged(existing.userId, existing.requestCode, status).catch(() => {})

      // Email only for the two terminal outcomes — a plain "now in
      // progress" doesn't warrant leaving the in-app notification.
      if (status === 'FULFILLED' || status === 'REJECTED') {
        await sendRequestUpdateEmail({
          to: existing.user.email,
          name: existing.user.name,
          requestCode: existing.requestCode,
          title: existing.title,
          status,
          adminResponse: adminResponse ?? existing.adminResponse,
          fulfilledUrl: fulfilledUrl ?? existing.fulfilledUrl,
          siteUrl: SITE_URL,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, request })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('admin/requests PATCH error:', err)
    return NextResponse.json({ success: false, error: 'Failed to update request', code: 500 }, { status: 500 })
  }
}
