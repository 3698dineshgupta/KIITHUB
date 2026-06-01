import { prisma } from '@/lib/prisma'
import { AdminNotesTable } from '@/components/admin/notes-table'
export default async function AdminNotesPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const resolvedSearchParams = await searchParams
  const page = parseInt(resolvedSearchParams.page ?? '1')
  const LIMIT = 20
  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      orderBy: { createdAt: 'desc' }, skip: (page-1)*LIMIT, take: LIMIT,
      include: { subject: { select:{name:true} }, branch: { select:{shortName:true} }, semester: { select:{number:true} } },
    }),
    prisma.note.count(),
  ])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Notes & PYQs</h1><p className="text-muted-foreground">{total} total materials</p></div>
        <a href="/admin/upload" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">+ Upload PDF</a>
      </div>
      <AdminNotesTable notes={notes} total={total} page={page} />
    </div>
  )
}
