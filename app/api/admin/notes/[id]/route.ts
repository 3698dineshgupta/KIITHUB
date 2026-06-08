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
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await requireAdmin(session.user.email)

    const body = await req.json()
    const allowed = ['isPremium', 'isPublished', 'title', 'description']
    const data: any = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    let item: any
    try {
      item = await prisma.note.update({ where: { id }, data })
    } catch {
      item = await prisma.pYQ.update({ where: { id }, data })
    }
    
    await cache.del(CACHE_KEYS.noteDetail(id))

    return NextResponse.json({ success: true, note })
  } catch (err: any) {
    if (err.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// Delete note (from DB + Telegram)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = await requireAdmin(session.user.email)

    let note = await prisma.note.findUnique({ where: { id } })
    let pyq = null
    if (!note) {
      pyq = await prisma.pYQ.findUnique({ where: { id } })
    }
    
    if (!note && !pyq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const target = note || pyq
    const resourceType = note ? 'note' : 'pyq'

    // Delete from Telegram channel
    try {
      await telegramDelete(target!.telegramMsgId)
    } catch (e) {
      console.warn('Telegram delete failed (file may already be gone):', e)
    }

    // Delete from DB
    if (note) {
      await prisma.note.delete({ where: { id } })
    } else if (pyq) {
      await prisma.pYQ.delete({ where: { id } })
    }
    
    await cache.del(CACHE_KEYS.noteDetail(id))

    // Audit log
    await prisma.auditLog.create({
      data: { userId: admin.id, action: 'DELETE', resource: resourceType, resourceId: id },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
