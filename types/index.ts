export interface SessionUser {
  id: string; name: string | null; email: string | null
  role: string; membershipStatus: string; membershipExpiry?: Date | null
}

export interface NoteWithRelations {
  id: string; title: string; slug: string; description: string | null
  contentType: string; isPremium: boolean; viewCount: number; downloadCount: number
  fileSize: number | null; totalPages: number | null; thumbnailUrl: string | null
  createdAt: Date; updatedAt: Date
  subject: { id: string; name: string; code: string | null }
  branch: { id: string; name: string; shortName: string }
  semester: { id: string; number: number; label: string }
  tags: { tag: string }[]
  isBookmarked?: boolean
}

export interface PYQWithRelations {
  id: string; title: string; slug: string; year: number; examType: string
  isPremium: boolean; viewCount: number; downloadCount: number
  fileSize: number | null; createdAt: Date
  subject: { id: string; name: string }
  branch: { id: string; name: string; shortName: string }
  semester: { id: string; number: number; label: string }
  isBookmarked?: boolean
}

export interface FilterParams {
  search?: string; branchId?: string; semesterId?: string; subjectId?: string
  year?: number; contentType?: string; isPremium?: boolean
  page?: number; limit?: number; sortBy?: 'latest' | 'popular' | 'downloads'
}

export interface PaginatedResult<T> {
  items: T[]; total: number; page: number; limit: number
  totalPages: number; hasNext: boolean
}

export interface SGPASubject { name: string; credits: number; grade: string }

export const GRADE_POINTS = [
  { grade: 'O', points: 10 }, { grade: 'E', points: 9 },
  { grade: 'A', points: 8 },  { grade: 'B', points: 7 },
  { grade: 'C', points: 6 },  { grade: 'D', points: 5 },
  { grade: 'F', points: 0 },
]

export function calculateSGPA(subjects: SGPASubject[]): number {
  const gmap = Object.fromEntries(GRADE_POINTS.map(g => [g.grade, g.points]))
  const total = subjects.reduce((s, x) => s + x.credits, 0)
  if (total === 0) return 0
  const ws = subjects.reduce((s, x) => s + x.credits * (gmap[x.grade] ?? 0), 0)
  return Math.round((ws / total) * 100) / 100
}

export function calculateCGPA(sems: { sgpa: number; credits: number }[]): number {
  const total = sems.reduce((s, x) => s + x.credits, 0)
  if (total === 0) return 0
  return Math.round((sems.reduce((s, x) => s + x.sgpa * x.credits, 0) / total) * 100) / 100
}
