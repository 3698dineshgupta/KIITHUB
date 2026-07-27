import { prisma } from '@/lib/prisma'
import { cache, CACHE_KEYS } from '@/lib/redis'

export interface SuggestionItem {
  type: 'note' | 'pyq'
  id: string
  slug: string
  title: string
  subjectName: string
  semesterNumber: number
  typeLabel: string
  fileSize: number | null
  viewCount: number
  isPremium: boolean
}

export interface SuggestionContext {
  type: 'note' | 'pyq'
  id: string
  subjectId: string
  semesterId: string
  branchId: string
  contentType?: string
  examType?: string
  tags?: string[]
}

const SUGGEST_LIMIT = 15
const CANDIDATE_POOL = 60
const SUGGEST_TTL = 300

const CONTENT_TYPE_LABELS: Record<string, string> = {
  NOTE: 'Notes',
  SYLLABUS: 'Syllabus',
  LAB_MANUAL: 'Lab Manual',
  ASSIGNMENT: 'Assignment',
}

type NoteCandidate = {
  kind: 'note'
  id: string
  slug: string
  title: string
  subjectId: string
  semesterId: string
  branchId: string
  contentType: string
  fileSize: number | null
  viewCount: number
  isPremium: boolean
  createdAt: Date
  subject: { name: string }
  semester: { number: number }
  tags: { tag: string }[]
}

type PyqCandidate = {
  kind: 'pyq'
  id: string
  slug: string
  title: string
  subjectId: string
  semesterId: string
  branchId: string
  examType: string
  fileSize: number | null
  viewCount: number
  isPremium: boolean
  createdAt: Date
  subject: { name: string }
  semester: { number: number }
}

// Deliberately excludes view count: it used to be folded straight into the
// score, so two siblings in the same multi-part series (identical subject/
// semester/content-type — the maximum-relevance tier) got different totals
// from view-count differences alone, and popularity silently overrode
// sequence — "Part 16" (18 views) would outrank "Part 1" (0 views) even
// though reading order clearly calls for 1 before 16. Popularity now only
// acts as a late tie-break (see getSuggestions), after relevance and after
// natural title order, so it can't do that anymore.
function scoreCandidate(cand: NoteCandidate | PyqCandidate, ctx: SuggestionContext): number {
  let score = 0
  if (cand.subjectId === ctx.subjectId) score += 100
  if (cand.semesterId === ctx.semesterId) score += 40
  if (cand.kind === ctx.type) {
    score += 12
    if (ctx.type === 'note' && cand.kind === 'note' && cand.contentType === ctx.contentType) score += 25
    if (ctx.type === 'pyq' && cand.kind === 'pyq' && cand.examType === ctx.examType) score += 20
  }
  if (cand.branchId === ctx.branchId) score += 10
  if (ctx.tags?.length && cand.kind === 'note') {
    const overlap = cand.tags.filter(t => ctx.tags!.includes(t.tag)).length
    score += overlap * 8
  }
  return score
}

/**
 * Ranks candidate Notes/PYQs against the document currently being viewed.
 * Priority order (highest weight first): same subject, same semester, same
 * content/exam type, keyword overlap, same branch, recent popularity.
 * Cached briefly per-document since scoring only depends on slow-changing
 * catalog metadata, not the viewer's session.
 */
export async function getSuggestions(ctx: SuggestionContext): Promise<SuggestionItem[]> {
  const cacheKey = CACHE_KEYS.suggestions(ctx.type, ctx.id)
  const cached = await cache.get<SuggestionItem[]>(cacheKey)
  if (cached) return cached

  const [notes, pyqs] = await Promise.all([
    prisma.note.findMany({
      where: {
        isPublished: true,
        id: { not: ctx.type === 'note' ? ctx.id : undefined },
        OR: [{ subjectId: ctx.subjectId }, { semesterId: ctx.semesterId }],
      },
      include: { subject: true, semester: true, tags: true },
      take: CANDIDATE_POOL,
      orderBy: { viewCount: 'desc' },
    }),
    prisma.pYQ.findMany({
      where: {
        isPublished: true,
        id: { not: ctx.type === 'pyq' ? ctx.id : undefined },
        OR: [{ subjectId: ctx.subjectId }, { semesterId: ctx.semesterId }],
      },
      include: { subject: true, semester: true },
      take: CANDIDATE_POOL,
      orderBy: { viewCount: 'desc' },
    }),
  ])

  const candidates: (NoteCandidate | PyqCandidate)[] = [
    ...notes.map(n => ({ kind: 'note' as const, ...n })),
    ...pyqs.map(p => ({ kind: 'pyq' as const, ...p })),
  ]

  // Rank by relevance first, then natural (numeric-aware) title order so a
  // multi-part series like "EPP Note Part 3", "... Part 15" always reads
  // sequentially — "Part 2" sorts before "Part 15" instead of being treated
  // as opaque strings. Popularity is only a last-resort tie-break, for the
  // rare case two titles collide exactly.
  const ranked = candidates
    .map(c => ({ c, score: scoreCandidate(c, ctx) }))
    .sort((a, b) =>
      b.score - a.score ||
      a.c.title.localeCompare(b.c.title, undefined, { numeric: true, sensitivity: 'base' }) ||
      b.c.viewCount - a.c.viewCount
    )
    .slice(0, SUGGEST_LIMIT)
    .map(({ c }): SuggestionItem => ({
      type: c.kind,
      id: c.id,
      slug: c.slug,
      title: c.title,
      subjectName: c.subject.name,
      semesterNumber: c.semester.number,
      typeLabel: c.kind === 'pyq' ? `PYQ · ${c.examType}` : (CONTENT_TYPE_LABELS[c.contentType] ?? 'Notes'),
      fileSize: c.fileSize,
      viewCount: c.viewCount,
      isPremium: c.isPremium,
    }))

  cache.set(cacheKey, ranked, SUGGEST_TTL).catch(() => {})
  return ranked
}
