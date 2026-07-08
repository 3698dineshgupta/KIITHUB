import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const { message } = await req.json()
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message is required', code: 400 }, { status: 400 })
    }

    const report = await prisma.bugReport.findFirst({ where: { OR: [{ id }, { bugId: id }] } })
    if (!report) return NextResponse.json({ success: false, error: 'Not found', code: 404 }, { status: 404 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    const isOwner = report.userId === session.user.id
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'MODERATOR')
    if (!isOwner && !isAdmin) return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })

    const comment = await prisma.bugComment.create({
      data: {
        bugId: report.id,
        authorId: session.user.id,
        isAdmin: !!isAdmin,
        message: message.trim().slice(0, 3000),
      },
    })

    return NextResponse.json({ success: true, comment }, { status: 201 })
  } catch (err) {
    console.error('bugs/[id]/comments POST error:', err)
    return NextResponse.json({ success: false, error: 'Failed to add comment', code: 500 }, { status: 500 })
  }
}
