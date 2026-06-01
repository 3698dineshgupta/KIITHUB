import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { telegramUpload } from '@/lib/telegram'
import { slugify } from '@/lib/utils'
import { z } from 'zod'

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

const metaSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  academicBranch: z.enum(['CSE', 'IT', 'ECE', 'ME', 'CE']),
  academicSemester: z.string().regex(/^[1-8]$/),
  classYear: z.enum(['1st year', '2nd year', '3rd year', '4th year']),
  subjectName: z.string().min(2).max(100),
  contentType: z.enum(['NOTE', 'PYQ', 'SYLLABUS', 'LAB_MANUAL', 'ASSIGNMENT']),
  isPremium: z.boolean().default(false),
  year: z.number().int().min(2000).max(2030).optional(),
  examType: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const metaRaw = form.get('meta') as string | null

    if (!file || !metaRaw) return NextResponse.json({ error: 'Missing file or metadata' }, { status: 400 })

    // Validate file
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files allowed' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 400 })
    }

    const meta = metaSchema.parse(JSON.parse(metaRaw))

    // Resolve or create Branch, Semester, Subject relations under the hood
    let dbBranch = await prisma.branch.findUnique({
      where: { shortName: meta.academicBranch },
    })
    if (!dbBranch) {
      dbBranch = await prisma.branch.create({
        data: {
          name: meta.academicBranch,
          shortName: meta.academicBranch,
        },
      })
    }

    const semNum = parseInt(meta.academicSemester)
    let dbSemester = await prisma.semester.findUnique({
      where: { number: semNum },
    })
    if (!dbSemester) {
      dbSemester = await prisma.semester.create({
        data: {
          number: semNum,
          label: `Semester ${semNum}`,
        },
      })
    }

    let dbSubject = await prisma.subject.findFirst({
      where: {
        name: meta.subjectName,
        branchId: dbBranch.id,
        semesterId: dbSemester.id,
      },
    })
    if (!dbSubject) {
      dbSubject = await prisma.subject.create({
        data: {
          name: meta.subjectName,
          branchId: dbBranch.id,
          semesterId: dbSemester.id,
        },
      })
    }

    // Upload to Telegram
    const buffer = Buffer.from(await file.arrayBuffer())
    const tgResult = await telegramUpload(buffer, file.name, meta.title)

    // Create DB record
    const baseSlug = slugify(meta.title)
    let slug = baseSlug
    let attempt = 0
    while (await prisma.note.findUnique({ where: { slug } })) {
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const note = await prisma.note.create({
      data: {
        title: meta.title,
        slug,
        description: meta.description,
        contentType: meta.contentType as any,
        subjectId: dbSubject.id,
        branchId: dbBranch.id,
        semesterId: dbSemester.id,
        academicBranch: meta.academicBranch,
        academicSemester: meta.academicSemester,
        classYear: meta.classYear,
        isPremium: meta.isPremium,
        telegramFileId: tgResult.fileId,
        telegramMsgId: tgResult.messageId,
        fileSize: tgResult.fileSize,
        uploadedById: user.id,
        ...(meta.tags?.length ? { tags: { create: meta.tags.map(t => ({ tag: t.toLowerCase().trim() })) } } : {}),
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'UPLOAD', resource: 'note', resourceId: note.id },
    })

    return NextResponse.json({ success: true, note })
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
