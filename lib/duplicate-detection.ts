import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

export function computeFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

// Loose but deterministic — no fuzzy-matching dependency. Two titles that
// differ only by punctuation/casing/whitespace ("DBMS Notes - Unit 1" vs
// "dbms notes unit 1") normalize to the same string; genuinely different
// titles don't.
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export interface DuplicateCheckArgs {
  fileHash: string
  title: string
  subjectName: string
  academicBranch: string
  academicSemester: string
  contentType: string
  examType?: string | null
}

/**
 * Purely informational — never blocks a submission. Returns a short,
 * human-readable note surfaced to the reviewer (Telegram caption + admin
 * panel) so they can make an informed reject decision; the caller always
 * still creates the submission regardless of what this returns.
 *
 * Two signals, checked in order of confidence:
 *  1. Exact file hash match against the live catalog or another pending/
 *     approved submission — the same bytes were uploaded before.
 *  2. Same normalized title within the same subject/branch/semester (and
 *     exam type, for PYQs) but a different file — likely a rescan or
 *     reformat of material that's already there.
 */
export async function findDuplicateWarning(args: DuplicateCheckArgs): Promise<string | null> {
  const isPyq = args.contentType === 'PYQ'
  const normTitle = normalizeTitle(args.title)

  const [hashMatchDoc, hashMatchSubmission] = await Promise.all([
    isPyq
      ? prisma.pYQ.findFirst({ where: { fileHash: args.fileHash }, select: { title: true } })
      : prisma.note.findFirst({ where: { fileHash: args.fileHash }, select: { title: true } }),
    prisma.contentSubmission.findFirst({
      where: { fileHash: args.fileHash, status: { in: ['PENDING', 'APPROVED'] } },
      select: { title: true },
    }),
  ])

  if (hashMatchDoc) return `Exact file match with existing ${isPyq ? 'PYQ' : 'Note'}: "${hashMatchDoc.title}"`
  if (hashMatchSubmission) return `Exact file match with another submission: "${hashMatchSubmission.title}"`

  const titleCandidates = isPyq
    ? await prisma.pYQ.findMany({
        where: {
          academicBranch: args.academicBranch,
          academicSemester: args.academicSemester,
          subject: { name: { equals: args.subjectName, mode: 'insensitive' } },
          ...(args.examType ? { examType: args.examType } : {}),
        },
        select: { title: true },
        take: 20,
      })
    : await prisma.note.findMany({
        where: {
          academicBranch: args.academicBranch,
          academicSemester: args.academicSemester,
          subject: { name: { equals: args.subjectName, mode: 'insensitive' } },
          contentType: args.contentType as never,
        },
        select: { title: true },
        take: 20,
      })

  const titleMatch = titleCandidates.find(c => normalizeTitle(c.title) === normTitle)
  if (titleMatch) return `Same title already exists for this subject (different file): "${titleMatch.title}"`

  return null
}
