import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { noteId, pyqId } = await req.json()
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  try {
    if (noteId) {
      await prisma.bookmark.create({ data: { userId: user.id, noteId } })
    } else if (pyqId) {
      await prisma.bookmark.create({ data: { userId: user.id, pyqId } })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Already bookmarked' }, { status: 409 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { noteId, pyqId } = await req.json()
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (noteId) {
    await prisma.bookmark.deleteMany({ where: { userId: user.id, noteId } })
  } else if (pyqId) {
    await prisma.bookmark.deleteMany({ where: { userId: user.id, pyqId } })
  }
  return NextResponse.json({ success: true })
}
