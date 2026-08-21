import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { telegramUpload } from '@/lib/telegram'
import { supabaseUpload } from '@/lib/supabase'
import { compressPdf } from '@/lib/ilovepdf'
import { cache, CACHE_KEYS } from '@/lib/redis'
import { slugify } from '@/lib/utils'
import { z } from 'zod'

// Allow up to 50 MB for PDF uploads
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '52mb',
  },
}

// Next.js App Router route segment config
export const maxDuration = 60

// Raw input ceiling — deliberately above Telegram's real serving limit
// (below) since a large-but-compressible file needs to fit here first.
const MAX_SIZE = 100 * 1024 * 1024 // 100 MB

// Telegram's bot getFile method — how the site later streams a document back
// out — hard-caps at 20MB regardless of upload method; this is Telegram's
// own platform limit, not configurable. A file saved above this would
// upload fine and then be permanently unviewable, so anything over a safe
// margin below it gets compressed first for Telegram-bound uploads.
const TELEGRAM_SAFE_LIMIT = 19 * 1024 * 1024 // 19 MB, leaving headroom

// Same compression trigger applies to Supabase-bound uploads: the
// `documents` bucket has no file_size_limit override (checked directly via
// the Storage API — it's null), so a reject there comes from the Supabase
// project's own default cap. Compressing anything over 19MB first — the
// same threshold as Telegram, for one consistent behavior — keeps uploads
// comfortably under that project default regardless of its exact value.
const SUPABASE_SAFE_LIMIT = 45 * 1024 * 1024 // 45 MB, headroom below the ~50MB project default

const metaSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  academicBranch: z.enum(['CSE', 'IT', 'ECE', 'ME', 'CE']),
  academicSemester: z.string().regex(/^[1-8]$/),
  classYear: z.enum(['1st year', '2nd year', '3rd year', '4th year']),
  subjectName: z.string().min(2).max(100),
  contentType: z.enum(['NOTE', 'PYQ', 'SYLLABUS', 'LAB_MANUAL', 'ASSIGNMENT']),
  isPremium: z.boolean().default(false),
  isMostExpected: z.boolean().default(false),
  year: z.number().int().min(2000).max(2030).optional(),
  examType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  storageProvider: z.enum(['telegram', 'supabase']).optional(),
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
      return NextResponse.json({ error: `File too large (max ${(MAX_SIZE / 1024 / 1024).toFixed(0)} MB)` }, { status: 400 })
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

    // Case-insensitive + trimmed: an exact match here let differently-cased
    // or trailing-whitespace spellings of the same subject (e.g. "Physics"
    // vs "physics") silently create near-duplicate rows on every upload
    // that didn't type the name identically to a prior one.
    const subjectName = meta.subjectName.trim()
    let dbSubject = await prisma.subject.findFirst({
      where: {
        name: { equals: subjectName, mode: 'insensitive' },
        branchId: dbBranch.id,
        semesterId: dbSemester.id,
      },
    })
    if (!dbSubject) {
      dbSubject = await prisma.subject.create({
        data: {
          name: subjectName,
          branchId: dbBranch.id,
          semesterId: dbSemester.id,
        },
      })
    }

    // Upload logic based on selected storage provider
    const settingsKey = CACHE_KEYS.settings()
    let settingsMap = await cache.get<Record<string, string>>(settingsKey)
    if (!settingsMap) {
      const dbSettings = await prisma.setting.findMany()
      settingsMap = Object.fromEntries(dbSettings.map(s => [s.key, s.value]))
      await cache.set(settingsKey, settingsMap, 3600)
    }

    const storageProvider = meta.storageProvider || settingsMap.storage_provider || 'telegram'
    const supabaseBucket = settingsMap.supabase_bucket || 'documents'

    let buffer: Buffer = Buffer.from(await file.arrayBuffer())
    let fileId = ''
    let msgId = ''
    let fileSize = 0

    // One shared compression trigger (19MB) for both providers — Telegram's
    // getFile can never serve anything over ~19-20MB no matter what, and
    // Supabase's project-wide default cap rejects this same file today, so
    // there's no provider where staying uncompressed above this line works.
    // What differs is the ceiling AFTER compression: Telegram still needs to
    // land under 19MB, but Supabase has real headroom up to its own limit.
    if (buffer.length > TELEGRAM_SAFE_LIMIT) {
      const postCompressionCeiling = storageProvider === 'supabase' ? SUPABASE_SAFE_LIMIT : TELEGRAM_SAFE_LIMIT
      const providerName = storageProvider === 'supabase' ? 'Supabase' : "Telegram's ~19 MB serving limit"

      let compressed
      try {
        compressed = await compressPdf(buffer, file.name)
      } catch (err) {
        console.error('iLovePDF compression error:', err)
        return NextResponse.json({
          error: `File is ${(buffer.length / 1024 / 1024).toFixed(1)} MB and compression failed. Try a smaller file.`,
        }, { status: 413 })
      }
      if (compressed.compressedSize > postCompressionCeiling) {
        return NextResponse.json({
          error: `Compressed from ${(compressed.originalSize / 1024 / 1024).toFixed(1)} MB to ${(compressed.compressedSize / 1024 / 1024).toFixed(1)} MB, still over ${providerName}.${storageProvider === 'supabase' ? ' Try compressing the PDF further before uploading.' : ' Use Supabase for this file instead.'}`,
        }, { status: 413 })
      }
      buffer = compressed.buffer
    }

    if (storageProvider === 'supabase') {
      const supResult = await supabaseUpload(buffer, file.name, supabaseBucket)
      fileId = supResult.path
      msgId = 'supabase'
      fileSize = supResult.fileSize
    } else {
      const tgResult = await telegramUpload(buffer, file.name, meta.title)
      fileId = tgResult.fileId
      msgId = tgResult.messageId
      fileSize = tgResult.fileSize
    }

    // Create DB record
    const baseSlug = slugify(meta.title)
    let slug = baseSlug
    let attempt = 0

    if (meta.contentType === 'PYQ') {
      while (await prisma.pYQ.findUnique({ where: { slug } })) {
        attempt++
        slug = `${baseSlug}-${attempt}`
      }
      const pyq = await prisma.pYQ.create({
        data: {
          title: meta.title,
          slug,
          description: meta.description,
          year: meta.year || new Date().getFullYear(),
          examType: meta.examType || 'End Semester',
          subjectId: dbSubject.id,
          branchId: dbBranch.id,
          semesterId: dbSemester.id,
          academicBranch: meta.academicBranch,
          academicSemester: meta.academicSemester,
          classYear: meta.classYear,
          isPremium: meta.isPremium,
          isMostExpected: meta.isMostExpected,
          telegramFileId: fileId,
          telegramMsgId: msgId,
          fileSize: fileSize,
          uploadedById: user.id,
        },
      })
      await prisma.auditLog.create({
        data: { userId: user.id, action: 'UPLOAD', resource: 'pyq', resourceId: pyq.id },
      })
      revalidatePath('/')
      return NextResponse.json({ success: true, pyq })
    }

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
        telegramFileId: fileId,
        telegramMsgId: msgId,
        fileSize: fileSize,
        uploadedById: user.id,
        ...(meta.tags?.length ? { tags: { create: meta.tags.map(t => ({ tag: t.toLowerCase().trim() })) } } : {}),
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'UPLOAD', resource: 'note', resourceId: note.id },
    })

    revalidatePath('/')

    return NextResponse.json({ success: true, note })
  } catch (err: any) {
    if (err?.name === 'ZodError') return NextResponse.json({ success: false, error: err.errors[0].message, code: 400 }, { status: 400 })
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('Upload DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('Upload error:', err)
    return NextResponse.json({ success: false, error: 'Upload failed', code: 500 }, { status: 500 })
  }
}
