import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { compressPdf } from '@/lib/ilovepdf'
import { sendSubmissionForApproval, formatSubmissionCaption } from '@/lib/telegram-submissions'
import { checkRateLimit } from '@/lib/ratelimit'
import { isUploadRewardActive, uploadRewardExpiresAt, UPLOAD_REWARD_THRESHOLD } from '@/lib/upload-reward'

export const config = { api: { bodyParser: false, sizeLimit: '52mb' } }
export const maxDuration = 60

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB raw ceiling, same headroom as the admin upload path
const TELEGRAM_SAFE_LIMIT = 19 * 1024 * 1024 // Telegram's getFile serving ceiling

const metaSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(1000).optional(),
  academicBranch: z.enum(['CSE', 'IT', 'ECE', 'ME', 'CE']),
  academicSemester: z.string().regex(/^[1-8]$/),
  classYear: z.enum(['1st year', '2nd year', '3rd year', '4th year']),
  subjectName: z.string().trim().min(2).max(100),
  contentType: z.enum(['NOTE', 'PYQ', 'SYLLABUS', 'LAB_MANUAL', 'ASSIGNMENT']),
  examType: z.string().optional(),
})

// Open to any signed-in user (not premium-gated — this is the path
// non-premium users use to earn premium access, so requiring premium here
// would be circular). Rate-limited per account to keep the reward program
// from being spammed with low-effort submissions.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const withinBudget = await checkRateLimit(`submission:${session.user.id}`, 5, 86400)
    if (!withinBudget) {
      return NextResponse.json({ success: false, error: 'Daily upload limit reached. Please try again tomorrow.', code: 429 }, { status: 429 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    const metaRaw = form.get('meta') as string | null
    if (!file || !metaRaw) return NextResponse.json({ success: false, error: 'Missing file or metadata', code: 400 }, { status: 400 })

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'Only PDF files allowed', code: 400 }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: `File too large (max ${(MAX_SIZE / 1024 / 1024).toFixed(0)} MB)`, code: 400 }, { status: 400 })
    }

    const meta = metaSchema.parse(JSON.parse(metaRaw))

    let buffer: Buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length > TELEGRAM_SAFE_LIMIT) {
      let compressed
      try {
        compressed = await compressPdf(buffer, file.name)
      } catch (err) {
        console.error('submission compression error:', err)
        return NextResponse.json({ success: false, error: `File is ${(buffer.length / 1024 / 1024).toFixed(1)} MB and compression failed. Try a smaller file.`, code: 413 }, { status: 413 })
      }
      if (compressed.compressedSize > TELEGRAM_SAFE_LIMIT) {
        return NextResponse.json({ success: false, error: `Compressed from ${(compressed.originalSize / 1024 / 1024).toFixed(1)} MB to ${(compressed.compressedSize / 1024 / 1024).toFixed(1)} MB, still too large. Try compressing it further before uploading.`, code: 413 }, { status: 413 })
      }
      buffer = compressed.buffer
    }

    // Created first so the Telegram caption can include a real submission ID
    // for the callback buttons — updated with the Telegram result right after.
    const submission = await prisma.contentSubmission.create({
      data: {
        userId: user.id,
        title: meta.title,
        description: meta.description || null,
        contentType: meta.contentType,
        examType: meta.contentType === 'PYQ' ? (meta.examType || 'End Semester') : null,
        academicBranch: meta.academicBranch,
        academicSemester: meta.academicSemester,
        classYear: meta.classYear,
        subjectName: meta.subjectName.trim(),
        telegramFileId: '',
        telegramMsgId: '',
        fileSize: buffer.length,
      },
    })

    const caption = formatSubmissionCaption({ ...submission, uploader: user }, undefined)
    const tgResult = await sendSubmissionForApproval({ submissionId: submission.id, buffer, fileName: file.name, caption })

    if (tgResult.ok) {
      await prisma.contentSubmission.update({
        where: { id: submission.id },
        data: { telegramFileId: tgResult.fileId!, telegramMsgId: String(tgResult.messageId), telegramMessageId: tgResult.messageId, telegramSent: true },
      })
    } else {
      // Still keep the submission (visible to the student as pending) even if
      // Telegram delivery failed — an admin can be notified/fixed separately
      // rather than losing the upload entirely.
      await prisma.contentSubmission.update({ where: { id: submission.id }, data: { telegramError: tgResult.error || 'Unknown error' } })
      console.error('sendSubmissionForApproval failed:', tgResult.error)
    }

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'SUBMISSION_CREATED', resource: 'content_submission', resourceId: submission.id },
    })

    return NextResponse.json({ success: true, id: submission.id }, { status: 201 })
  } catch (err: any) {
    if (err?.name === 'ZodError') return NextResponse.json({ success: false, error: err.errors[0].message, code: 400 }, { status: 400 })
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('submissions POST error:', err)
    return NextResponse.json({ success: false, error: 'Upload failed', code: 500 }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const [submissions, user] = await Promise.all([
      prisma.contentSubmission.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { uploadRewardGrantedAt: true, uploadPremiumCredits: true } }),
    ])

    const approvedCount = submissions.filter(s => s.status === 'APPROVED').length
    const rewardActive = user ? isUploadRewardActive(user) : false

    return NextResponse.json({
      success: true,
      submissions,
      reward: {
        approvedCount,
        uploadsNeeded: Math.max(0, UPLOAD_REWARD_THRESHOLD - approvedCount),
        active: rewardActive,
        creditsRemaining: rewardActive ? (user?.uploadPremiumCredits ?? 0) : 0,
        expiresAt: rewardActive && user?.uploadRewardGrantedAt ? uploadRewardExpiresAt(user.uploadRewardGrantedAt) : null,
      },
    })
  } catch (err) {
    console.error('submissions GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load submissions', code: 500 }, { status: 500 })
  }
}
