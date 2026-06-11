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
    const allowed = ['isPremium', 'isPublished', 'title', 'description', 'academicBranch', 'academicSemester', 'classYear', 'subjectName', 'contentType', 'examType', 'tags']
    const data: any = {}
    for (const key of allowed) {
      if (key in body && key !== 'tags' && key !== 'subjectName') data[key] = body[key]
    }

    // Resolve Subject/Branch/Semester if provided
    if (body.subjectName && body.academicBranch && body.academicSemester) {
      let dbBranch = await prisma.branch.findUnique({ where: { shortName: body.academicBranch } })
      if (!dbBranch) dbBranch = await prisma.branch.create({ data: { name: body.academicBranch, shortName: body.academicBranch } })

      const semNum = parseInt(body.academicSemester)
      let dbSemester = await prisma.semester.findUnique({ where: { number: semNum } })
      if (!dbSemester) dbSemester = await prisma.semester.create({ data: { number: semNum, label: `Semester ${semNum}` } })

      let dbSubject = await prisma.subject.findFirst({ where: { name: body.subjectName, branchId: dbBranch.id, semesterId: dbSemester.id } })
      if (!dbSubject) dbSubject = await prisma.subject.create({ data: { name: body.subjectName, branchId: dbBranch.id, semesterId: dbSemester.id } })

      data.subjectId = dbSubject.id
      data.branchId = dbBranch.id
      data.semesterId = dbSemester.id
    }

    let item: any = await prisma.note.findUnique({ where: { id } })
    const isNote = !!item

    // Build model-specific data (PYQ has no contentType; Note has no examType)
    const noteAllowed = ['isPremium', 'isPublished', 'title', 'description', 'academicBranch', 'academicSemester', 'classYear', 'contentType']
    const pyqAllowed  = ['isPremium', 'isPublished', 'title', 'description', 'academicBranch', 'academicSemester', 'classYear', 'examType']

    const specificData: any = {}
    const allowedKeys = isNote ? noteAllowed : pyqAllowed
    for (const key of allowedKeys) {
      if (key in body) specificData[key] = body[key]
    }

    // Merge relation IDs resolved above
    if (data.subjectId) specificData.subjectId = data.subjectId
    if (data.branchId)  specificData.branchId  = data.branchId
    if (data.semesterId) specificData.semesterId = data.semesterId

    if (isNote) {
      if (body.tags && Array.isArray(body.tags)) {
        await prisma.noteTag.deleteMany({ where: { noteId: id } })
        if (body.tags.length > 0) {
          specificData.tags = { create: body.tags.map((t: string) => ({ tag: t.toLowerCase().trim() })) }
        }
      }
      item = await prisma.note.update({ where: { id }, data: specificData })
    } else {
      item = await prisma.pYQ.update({ where: { id }, data: specificData })
    }
    
    await cache.del(CACHE_KEYS.noteDetail(id))
    await cache.del('home:data')

    return NextResponse.json({ success: true, note: item })
  } catch (err: any) {
    if (err.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('PATCH note error:', err)
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

    // Delete from Storage
    try {
      if (target!.telegramMsgId === 'supabase') {
        const { supabaseDelete } = await import('@/lib/supabase')
        const { cache, CACHE_KEYS } = await import('@/lib/redis')
        const settingsKey = CACHE_KEYS.settings()
        let settingsMap = await cache.get<Record<string, string>>(settingsKey)
        if (!settingsMap) {
          const dbSettings = await prisma.setting.findMany()
          settingsMap = Object.fromEntries(dbSettings.map(s => [s.key, s.value]))
          await cache.set(settingsKey, settingsMap, 3600)
        }
        const supabaseBucket = settingsMap.supabase_bucket || 'documents'
        await supabaseDelete(target!.telegramFileId, supabaseBucket)
      } else {
        await telegramDelete(target!.telegramMsgId)
      }
    } catch (e) {
      console.warn('Storage delete failed (file may already be gone):', e)
    }

    // Delete from DB
    if (note) {
      await prisma.note.delete({ where: { id } })
    } else if (pyq) {
      await prisma.pYQ.delete({ where: { id } })
    }
    
    await cache.del(CACHE_KEYS.noteDetail(id))
    await cache.del('home:data')

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
