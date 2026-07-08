import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const report = await prisma.bugReport.findFirst({
      where: { OR: [{ id }, { bugId: id }] },
      include: { comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } } },
    })
    if (!report) return NextResponse.json({ success: false, error: 'Not found', code: 404 }, { status: 404 })

    const admin = await prisma.user.findUnique({ where: { id: session.user.id } })
    const isOwner = report.userId === session.user.id
    const isAdmin = admin && (admin.role === 'ADMIN' || admin.role === 'MODERATOR')
    if (!isOwner && !isAdmin) return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })

    return NextResponse.json({ success: true, report })
  } catch (err) {
    console.error('bugs/[id] GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load report', code: 500 }, { status: 500 })
  }
}
