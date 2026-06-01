import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { telegramDelete } from '@/lib/telegram'
import { cache, CACHE_KEYS } from '@/lib/redis'

async function requireAdmin(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) throw new Error('Forbidden')
  return user
}

// Update note (isPremium, isPublished, title, etc.)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await requireAdmin(session.user.email)

    const body = await req.json()
    const allowed = ['isPremium', 'isPublished', 'title', 'description', 'previewPages']
    const data: any = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    const note = await prisma.note.update({ where: { id: params.id }, data })
    await cache.del(CACHE_KEYS.noteDetail(params.id))

    return NextResponse.json({ success: true, note })
  } catch (err: any) {
    if (err.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// Delete note (from DB + Telegram)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = await requireAdmin(session.user.email)

    const note = await prisma.note.findUnique({ where: { id: params.id } })
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete from Telegram channel
    try {
      await telegramDelete(note.telegramMsgId)
    } catch (e) {
      console.warn('Telegram delete failed (file may already be gone):', e)
    }

    // Delete from DB (cascade handles bookmarks, views, downloads)
    await prisma.note.delete({ where: { id: params.id } })
    await cache.del(CACHE_KEYS.noteDetail(params.id))

    // Audit log
    await prisma.auditLog.create({
      data: { userId: admin.id, action: 'DELETE', resource: 'note', resourceId: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
