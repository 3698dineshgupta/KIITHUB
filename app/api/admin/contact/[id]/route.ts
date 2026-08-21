import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { responded } = body as { responded?: boolean }

    const message = await prisma.contactMessage.update({
      where: { id },
      data: { respondedAt: responded === false ? null : new Date() },
    })

    return NextResponse.json({ success: true, message })
  } catch (err) {
    console.error('admin/contact PATCH error:', err)
    return NextResponse.json({ success: false, error: 'Failed to update message', code: 500 }, { status: 500 })
  }
}
