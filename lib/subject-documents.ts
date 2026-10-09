import { prisma } from '@/lib/prisma'
import { cache, CACHE_KEYS } from '@/lib/redis'

export interface SubjectDocumentItem {
  type: 'note' | 'pyq'
  slug: string
  title: string
  totalPages: number | null
  isPremium: boolean
}

export interface SubjectDocumentGroup {
  label: string
  items: SubjectDocumentItem[]
}

const SUBJECT_DOCS_TTL = 600

const CONTENT_TYPE_LABELS: Record<string, string> = {
  NOTE: 'Notes',
  SYLLABUS: 'Syllabus',
  LAB_MANUAL: 'Lab Manual',
  ASSIGNMENT: 'Assignment',
}

const GROUP_ORDER = ['Syllabus', 'Notes', 'Lab Manual', 'Assignment', 'Past Questions']

/**
 * Every published Note/PYQ under one subject, grouped by content type — the
 * "all documents for this subject in one place" panel. Unlike
 * getSuggestions (ranked, capped at 15, excludes the current document), this
 * is exhaustive and stable: the same list regardless of which document in
 * the subject is currently open, so a reader can always find a sibling
 * document instead of it being missing because it scored too low to rank.
 */
export async function getSubjectDocuments(subjectId: string): Promise<SubjectDocumentGroup[]> {
  const cacheKey = CACHE_KEYS.subjectDocuments(subjectId)
  const cached = await cache.get<SubjectDocumentGroup[]>(cacheKey)
  if (cached) return cached

  const [notes, pyqs] = await Promise.all([
    prisma.note.findMany({
      where: { subjectId, isPublished: true },
      select: { slug: true, title: true, contentType: true, totalPages: true, isPremium: true },
    }),
    prisma.pYQ.findMany({
      where: { subjectId, isPublished: true },
      select: { slug: true, title: true, isPremium: true },
    }),
  ])

  const byLabel = new Map<string, SubjectDocumentItem[]>()
  const push = (label: string, item: SubjectDocumentItem) => {
    if (!byLabel.has(label)) byLabel.set(label, [])
    byLabel.get(label)!.push(item)
  }

  for (const n of notes) {
    push(CONTENT_TYPE_LABELS[n.contentType] ?? 'Notes', {
      type: 'note',
      slug: n.slug,
      title: n.title,
      totalPages: n.totalPages,
      isPremium: n.isPremium,
    })
  }
  for (const p of pyqs) {
    push('Past Questions', { type: 'pyq', slug: p.slug, title: p.title, totalPages: null, isPremium: p.isPremium })
  }

  const groups = GROUP_ORDER.filter(label => byLabel.has(label)).map(label => ({
    label,
    items: byLabel
      .get(label)!
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })),
  }))

  cache.set(cacheKey, groups, SUBJECT_DOCS_TTL).catch(() => {})
  return groups
}
