import { prisma } from '@/lib/prisma'
import { AdminSubmissionsTable } from '@/components/admin/submissions-table'

export default async function AdminSubmissionsPage() {
  const submissions = await prisma.contentSubmission.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Uploads</h1>
        <p className="text-muted-foreground">
          {submissions.length} submissions to the Upload &amp; Earn Premium program. Approve/reject here or via the Telegram buttons — both stay in sync.
        </p>
      </div>
      <AdminSubmissionsTable submissions={submissions} />
    </div>
  )
}
