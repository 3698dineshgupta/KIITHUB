import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PYQCard } from '@/components/notes/pyq-card'

const LIMIT = 12

export async function PYQList({ searchParams }: { searchParams: Record<string, string> }) {
  const session = await auth()
  const page = parseInt(searchParams.page ?? '1')
  const search = searchParams.search ?? ''
  const branchId = searchParams.branch
  const semesterId = searchParams.semester
  const year = searchParams.year ? parseInt(searchParams.year) : undefined
  const subjectName = searchParams.subject
  const examType = searchParams.examType
  const sortBy = searchParams.sort ?? 'latest'

  const where: any = { isPublished: true }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { subject: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }
  if (branchId) where.branchId = branchId
  if (semesterId) where.semesterId = semesterId
  if (year) where.year = year
  if (subjectName) where.subject = { name: subjectName }
  if (examType) where.examType = examType

  const orderBy: any =
    sortBy === 'popular' ? { viewCount: 'desc' } :
    sortBy === 'year' ? { year: 'desc' } :
    { createdAt: 'desc' }

  const [pyqs, total] = await Promise.all([
    prisma.pYQ.findMany({
      where, orderBy, skip: (page - 1) * LIMIT, take: LIMIT,
      include: { subject: true, branch: true, semester: true },
    }),
    prisma.pYQ.count({ where }),
  ])

  let bookmarkedIds = new Set<string>()
  if (session?.user?.id) {
    const bks = await prisma.bookmark.findMany({
      where: { userId: session.user.id, pyqId: { in: pyqs.map(p => p.id) } },
      select: { pyqId: true },
    })
    bookmarkedIds = new Set(bks.map(b => b.pyqId!))
  }

  const totalPages = Math.ceil(total / LIMIT)

  if (!pyqs.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium mb-2">No PYQs found</p>
        <p className="text-sm">Try adjusting your filters or search query.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{total} result{total !== 1 ? 's' : ''}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {pyqs.map(pyq => (
          <PYQCard key={pyq.id} pyq={pyq} />
        ))}
      </div>

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
