import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Crown, Lock, FileText, Calendar } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

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
  if (session?.user) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email! } })
    if (user) {
      const bks = await prisma.bookmark.findMany({
        where: { userId: user.id, pyqId: { in: pyqs.map(p => p.id) } },
        select: { pyqId: true },
      })
      bookmarkedIds = new Set(bks.map(b => b.pyqId!))
    }
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
          <Link key={pyq.id} href={`/pyq/${pyq.slug}`}>
            <Card className={`h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group overflow-hidden ${pyq.isPremium ? 'border-amber-300 dark:border-amber-700' : ''}`}>
              {pyq.isPremium && <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />}
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">PYQ</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />{pyq.year}
                  </span>
                  {pyq.isPremium && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Crown className="h-3 w-3" />Premium
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">{pyq.title}</h3>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{pyq.subject.name}</span>
                  <span>Sem {pyq.semester.number}</span>
                  <span>{pyq.branch.shortName}</span>
                </div>

                <div className="text-xs text-muted-foreground mb-1">{pyq.examType}</div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{pyq.viewCount}</span>
                  </div>
                  {pyq.isPremium && <Lock className="h-3 w-3 text-amber-500" />}
                </div>
              </CardContent>
            </Card>
          </Link>
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
