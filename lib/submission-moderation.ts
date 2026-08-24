import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { slugify } from '@/lib/utils'
import { editSubmissionMessage, formatSubmissionCaption } from '@/lib/telegram-submissions'
import { notifySubmissionApproved, notifySubmissionRejected, notifyUploadRewardGranted } from '@/lib/submission-notify'
import { sendUploadRewardGrantedEmail } from '@/lib/mail'
import { maybeGrantUploadReward, uploadRewardExpiresAt, UPLOAD_REWARD_CREDITS, UPLOAD_REWARD_WINDOW_DAYS } from '@/lib/upload-reward'

// Same Branch/Semester/Subject resolve-or-create shape as app/api/upload/route.ts
// (the admin upload path) — kept as its own copy rather than a shared helper
// since the two call sites take slightly different input shapes (FormData
// meta vs. a stored ContentSubmission row) and this isn't hot-path code.
async function resolveCatalog(args: { academicBranch: string; academicSemester: string; subjectName: string }) {
  let branch = await prisma.branch.findUnique({ where: { shortName: args.academicBranch } })
  if (!branch) branch = await prisma.branch.create({ data: { name: args.academicBranch, shortName: args.academicBranch } })

  const semNum = parseInt(args.academicSemester)
  let semester = await prisma.semester.findUnique({ where: { number: semNum } })
  if (!semester) semester = await prisma.semester.create({ data: { number: semNum, label: `Semester ${semNum}` } })

  const subjectName = args.subjectName.trim()
  let subject = await prisma.subject.findFirst({
    where: { name: { equals: subjectName, mode: 'insensitive' }, branchId: branch.id, semesterId: semester.id },
  })
  if (!subject) subject = await prisma.subject.create({ data: { name: subjectName, branchId: branch.id, semesterId: semester.id } })

  return { branch, semester, subject }
}

export async function approveSubmission(submissionId: string, adminId: string | null) {
  const submission = await prisma.contentSubmission.findUnique({ where: { id: submissionId }, include: { user: true } })
  if (!submission) return { ok: false as const, error: 'Submission not found' }
  if (submission.status !== 'PENDING') return { ok: false as const, error: 'Submission already reviewed' }

  const { branch, semester, subject } = await resolveCatalog(submission)

  const baseSlug = slugify(submission.title)
  let slug = baseSlug
  let attempt = 0

  let publishedType: 'note' | 'pyq'
  let publishedSlug: string

  if (submission.contentType === 'PYQ') {
    while (await prisma.pYQ.findUnique({ where: { slug } })) { attempt++; slug = `${baseSlug}-${attempt}` }
    const pyq = await prisma.pYQ.create({
      data: {
        title: submission.title,
        slug,
        description: submission.description,
        year: new Date().getFullYear(),
        examType: submission.examType || 'End Semester',
        subjectId: subject.id,
        branchId: branch.id,
        semesterId: semester.id,
        academicBranch: submission.academicBranch,
        academicSemester: submission.academicSemester,
        classYear: submission.classYear,
        isPremium: false,
        telegramFileId: submission.telegramFileId,
        telegramMsgId: submission.telegramMsgId,
        fileSize: submission.fileSize,
        uploadedById: submission.userId,
      },
    })
    publishedType = 'pyq'
    publishedSlug = pyq.slug
  } else {
    while (await prisma.note.findUnique({ where: { slug } })) { attempt++; slug = `${baseSlug}-${attempt}` }
    const note = await prisma.note.create({
      data: {
        title: submission.title,
        slug,
        description: submission.description,
        contentType: submission.contentType,
        subjectId: subject.id,
        branchId: branch.id,
        semesterId: semester.id,
        academicBranch: submission.academicBranch,
        academicSemester: submission.academicSemester,
        classYear: submission.classYear,
        isPremium: false,
        telegramFileId: submission.telegramFileId,
        telegramMsgId: submission.telegramMsgId,
        fileSize: submission.fileSize,
        uploadedById: submission.userId,
      },
    })
    publishedType = 'note'
    publishedSlug = note.slug
  }

  const updated = await prisma.contentSubmission.update({
    where: { id: submissionId },
    data: { status: 'APPROVED', publishedType, publishedSlug, awaitingCustomReason: false },
  })

  await prisma.auditLog.create({
    data: { userId: adminId, action: 'SUBMISSION_APPROVED', resource: 'content_submission', resourceId: submissionId, metadata: { publishedType, publishedSlug } },
  })

  await notifySubmissionApproved(submission.userId, submission.title).catch(() => {})

  const rewardGranted = await maybeGrantUploadReward(submission.userId).catch(() => false)
  if (rewardGranted) {
    await notifyUploadRewardGranted(submission.userId).catch(() => {})
    await sendUploadRewardGrantedEmail(
      submission.user.email,
      submission.user.name,
      UPLOAD_REWARD_CREDITS,
      UPLOAD_REWARD_WINDOW_DAYS,
      uploadRewardExpiresAt(new Date())
    ).catch(() => {})
  }

  if (submission.telegramMessageId) {
    const caption = formatSubmissionCaption({ ...submission, uploader: submission.user }, '✅ APPROVED')
    await editSubmissionMessage(submission.telegramMessageId, caption)
  }

  revalidatePath('/')
  return { ok: true as const, submission: updated, rewardGranted }
}

export async function rejectSubmission(submissionId: string, adminId: string | null, reason: string) {
  const submission = await prisma.contentSubmission.findUnique({ where: { id: submissionId }, include: { user: true } })
  if (!submission) return { ok: false as const, error: 'Submission not found' }
  if (submission.status !== 'PENDING') return { ok: false as const, error: 'Submission already reviewed' }

  const updated = await prisma.contentSubmission.update({
    where: { id: submissionId },
    data: { status: 'REJECTED', rejectionReason: reason, awaitingCustomReason: false },
  })

  await prisma.auditLog.create({
    data: { userId: adminId, action: 'SUBMISSION_REJECTED', resource: 'content_submission', resourceId: submissionId, metadata: { reason } },
  })

  await notifySubmissionRejected(submission.userId, submission.title, reason).catch(() => {})

  if (submission.telegramMessageId) {
    const caption = formatSubmissionCaption({ ...submission, uploader: submission.user }, `❌ REJECTED\nReason: ${reason}`)
    await editSubmissionMessage(submission.telegramMessageId, caption)
  }

  return { ok: true as const, submission: updated }
}

export async function markSubmissionAwaitingCustomReason(submissionId: string) {
  await prisma.contentSubmission.update({ where: { id: submissionId }, data: { awaitingCustomReason: true } })
}
