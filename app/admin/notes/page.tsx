import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { AdminNotesTable } from '@/components/admin/notes-table'
export default async function AdminNotesPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const resolvedSearchParams = await searchParams
  const page = parseInt(resolvedSearchParams.page ?? '1')
  const search = (resolvedSearchParams.search ?? '').trim()
  const LIMIT = 20

  // Filtered at the DB level (mirrors the Users admin page's convention)
  // rather than fetching everything and filtering in memory — matters more
  // here since this list is already the heavier one (400+ combined rows).
  const searchFilter = search
    ? [
        { title: { contains: search, mode: 'insensitive' as const } },
        { subject: { name: { contains: search, mode: 'insensitive' as const } } },
      ]
    : undefined

  const [notes, notesCount, pyqs, pyqsCount] = await Promise.all([
    prisma.note.findMany({
      where: searchFilter ? { OR: searchFilter } : undefined,
      include: { subject: { select:{name:true} }, branch: { select:{shortName:true} }, semester: { select:{number:true} } },
    }),
    prisma.note.count({ where: searchFilter ? { OR: searchFilter } : undefined }),
    prisma.pYQ.findMany({
      where: searchFilter ? { OR: searchFilter } : undefined,
      include: { subject: { select:{name:true} }, branch: { select:{shortName:true} }, semester: { select:{number:true} } },
    }),
    prisma.pYQ.count({ where: searchFilter ? { OR: searchFilter } : undefined }),
  ])

  const combined = [
    ...notes,
    ...pyqs.map(p => ({ ...p, contentType: 'PYQ' }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const paginatedNotes = combined.slice((page - 1) * LIMIT, page * LIMIT)
  const total = notesCount + pyqsCount
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Notes & PYQs</h1><p className="text-muted-foreground">{total} total materials</p></div>
        <Link href="/admin/upload" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">+ Upload PDF</Link>
      </div>
      <AdminNotesTable notes={paginatedNotes} total={total} page={page} search={search} />
    </div>
  )
}
