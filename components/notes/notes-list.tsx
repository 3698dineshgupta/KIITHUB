import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { NoteCard } from '@/components/notes/note-card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { ContentType } from '@prisma/client'

const LIMIT = 12

export async function NotesList({ searchParams }: { searchParams: Record<string, string> }) {
  const session = await auth()
  const page = parseInt(searchParams.page ?? '1')
  const search = searchParams.search ?? ''
  const branchId = searchParams.branch
  const semesterId = searchParams.semester
  const contentType = searchParams.type as ContentType | undefined
  const subjectName = searchParams.subject
  const sortBy = searchParams.sort ?? 'latest'

  const whereNote: any = { isPublished: true }
  const wherePyq: any = { isPublished: true }

  if (search) {
    whereNote.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { subject: { name: { contains: search, mode: 'insensitive' } } },
      { tags: { some: { tag: { contains: search, mode: 'insensitive' } } } },
    ]
    wherePyq.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { subject: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }
  if (branchId) {
    whereNote.branchId = branchId
    wherePyq.branchId = branchId
  }
  if (semesterId) {
    whereNote.semesterId = semesterId
    wherePyq.semesterId = semesterId
  }
  if (subjectName) {
    whereNote.subject = { name: subjectName }
    wherePyq.subject = { name: subjectName }
  }
  if (contentType && contentType !== 'PYQ') {
    whereNote.contentType = contentType
  }

  const fetchNotes = !contentType || contentType !== 'PYQ'
  const fetchPyqs = !contentType || contentType === 'PYQ'

  let combined: any[] = []
  let total = 0

  // Fetching only the top `page * LIMIT` rows from each table (sorted the
  // same way as the final merge) is enough to guarantee a correct merged
  // result for the current page — the true top-K of two same-sorted lists
  // is always contained within the top-K of each individually. This avoids
  // pulling every published note/PYQ into memory on every request.
  const perTableTake = page * LIMIT
  const orderBy = sortBy === 'popular' ? { viewCount: 'desc' as const } : { createdAt: 'desc' as const }

  try {
    const [notes, pyqs, noteCount, pyqCount] = await Promise.all([
      fetchNotes ? prisma.note.findMany({ where: whereNote, include: { subject: true, branch: true, semester: true }, orderBy, take: perTableTake }) : Promise.resolve([]),
      fetchPyqs ? prisma.pYQ.findMany({ where: wherePyq, include: { subject: true, branch: true, semester: true }, orderBy, take: perTableTake }) : Promise.resolve([]),
      fetchNotes ? prisma.note.count({ where: whereNote }) : Promise.resolve(0),
      fetchPyqs ? prisma.pYQ.count({ where: wherePyq }) : Promise.resolve(0),
    ])

    combined = [
      ...notes,
      ...pyqs.map(p => ({ ...p, contentType: 'PYQ' }))
    ]

    // Sort the merged (already individually-sorted) top-K rows
    if (sortBy === 'popular') {
      combined.sort((a, b) => b.viewCount - a.viewCount)
    } else {
      combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    }

    total = noteCount + pyqCount
  } catch (err) {
    console.error('Failed to fetch notes:', err)
    return (
      <div className="text-center py-16 text-destructive">
        <p className="text-lg font-medium mb-2">Error loading notes</p>
        <p className="text-sm">Please try refreshing the page.</p>
      </div>
    )
  }

  // Apply pagination
  const paginatedNotes = combined.slice((page - 1) * LIMIT, page * LIMIT)

  // Attach bookmark status for signed-in users
  let bookmarkedIds = new Set<string>()
  if (session?.user?.id) {
    try {
      const bks = await prisma.bookmark.findMany({
        where: { userId: session.user.id, noteId: { in: paginatedNotes.map(n => n.id) } },
        select: { noteId: true },
      })
      bookmarkedIds = new Set(bks.map(b => b.noteId!))
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  if (!combined.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium mb-2">No documents found</p>
        <p className="text-sm">Try adjusting your filters or search query.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{total} result{total !== 1 ? 's' : ''}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {paginatedNotes.map(note => (
          <NoteCard
            key={note.id}
            note={{ ...note, isBookmarked: bookmarkedIds.has(note.id) }}
            showBookmark={!!session}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          {page > 1 && (
            <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}>
              <Button variant="outline" size="sm">Previous</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground px-3">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}>
              <Button variant="outline" size="sm">Next</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
