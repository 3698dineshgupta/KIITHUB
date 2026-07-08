import { prisma } from '@/lib/prisma'
import { AdminBugsTable } from '@/components/admin/bugs-table'

export default async function AdminBugsPage() {
  const reports = await prisma.bugReport.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Bug Reports</h1><p className="text-muted-foreground">Triage and respond to reports submitted by students</p></div>
      <AdminBugsTable reports={reports} />
    </div>
  )
}
