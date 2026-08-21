import { prisma } from '@/lib/prisma'
import { AdminRequestsTable } from '@/components/admin/requests-table'

export default async function AdminRequestsPage() {
  const requests = await prisma.contentRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Request Hub</h1><p className="text-muted-foreground">{requests.length} content requests from premium students</p></div>
      <AdminRequestsTable requests={requests} />
    </div>
  )
}
