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
  const sortBy = searchParams.sort ?? 'latest'

  const where: any = { isPublished: true }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { subject: { name: { contains: search, mode: 'insensitive' } } },
      { tags: { some: { tag: { contains: search, mode: 'insensitive' } } } },
    ]
  }
  if (branchId) where.branchId = branchId
  if (semesterId) where.semesterId = semesterId
  if (contentType) where.contentType = contentType

  const orderBy: any =
    sortBy === 'popular' ? { viewCount: 'desc' } :
    { createdAt: 'desc' }

  let notes: any[] = []
  let total = 0

  try {
    const results = await Promise.all([
      prisma.note.findMany({
        where, orderBy, skip: (page - 1) * LIMIT, take: LIMIT,
        include: { subject: true, branch: true, semester: true, tags: true },
      }),
      prisma.note.count({ where }),
    ])
    notes = results[0]
    total = results[1]
  } catch (err) {
    console.error('Failed to fetch notes:', err)
    return (
      <div className="text-center py-16 text-destructive">
        <p className="text-lg font-medium mb-2">Error loading notes</p>
        <p className="text-sm">Please try refreshing the page.</p>
      </div>
    )
  }

  // Attach bookmark status for signed-in users
  let bookmarkedIds = new Set<string>()
  if (session?.user?.id) {
    try {
      const bks = await prisma.bookmark.findMany({
        where: { userId: session.user.id, noteId: { in: notes.map(n => n.id) } },
        select: { noteId: true },
      })
      bookmarkedIds = new Set(bks.map(b => b.noteId!))
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  if (!notes.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium mb-2">No notes found</p>
        <p className="text-sm">Try adjusting your filters or search query.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{total} result{total !== 1 ? 's' : ''}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {notes.map(note => (
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
