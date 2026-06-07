import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })
    const { noteId, pyqId } = await req.json()
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ success: false, error: 'User not found', code: 404 }, { status: 404 })
    try {
      if (noteId) {
        await prisma.bookmark.create({ data: { userId: user.id, noteId } })
      } else if (pyqId) {
        await prisma.bookmark.create({ data: { userId: user.id, pyqId } })
      }
      return NextResponse.json({ success: true })
    } catch (e: any) {
      // Unique constraint / already bookmarked
      const em = String(e?.message ?? '')
      if (em.includes('Unique constraint failed') || em.includes('already exists')) {
        return NextResponse.json({ success: false, error: 'Already bookmarked', code: 409 }, { status: 409 })
      }
      throw e
    }
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('bookmark POST DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('bookmark error:', err)
    return NextResponse.json({ success: false, error: 'Bookmark failed', code: 500 }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })
    const { noteId, pyqId } = await req.json()
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ success: false, error: 'User not found', code: 404 }, { status: 404 })
    if (noteId) {
      await prisma.bookmark.deleteMany({ where: { userId: user.id, noteId } })
    } else if (pyqId) {
      await prisma.bookmark.deleteMany({ where: { userId: user.id, pyqId } })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('bookmark DELETE DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('bookmark delete error:', err)
    return NextResponse.json({ success: false, error: 'Delete bookmark failed', code: 500 }, { status: 500 })
  }
}
