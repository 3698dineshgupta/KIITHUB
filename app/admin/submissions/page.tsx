import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { BadgeProps } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, BadgeProps['variant']> = {
  PENDING: 'secondary', APPROVED: 'success', REJECTED: 'destructive',
}

export default async function AdminSubmissionsPage() {
  const submissions = await prisma.contentSubmission.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { user: { select: { name: true, email: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Uploads</h1>
        <p className="text-muted-foreground">
          {submissions.length} submissions to the Upload &amp; Earn Premium program — reviewed via Telegram (Approve/Reject buttons on each upload). This page is read-only.
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No submissions yet</p></Card>
      ) : (
        <div className="space-y-3">
          {submissions.map(s => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={STATUS_BADGE[s.status]} className="text-xs">{s.status}</Badge>
                    <Badge variant="secondary" className="text-xs">{s.contentType}{s.examType ? ` · ${s.examType}` : ''}</Badge>
                    {!s.telegramSent && <Badge variant="destructive" className="text-xs">Telegram delivery failed</Badge>}
                  </div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.user.name} ({s.user.email}) · {s.subjectName} · {s.academicBranch} Sem {s.academicSemester} · {formatDate(s.createdAt)}
                  </p>
                  {s.status === 'REJECTED' && s.rejectionReason && (
                    <p className="text-xs text-muted-foreground mt-1">Reason: {s.rejectionReason}</p>
                  )}
                  {s.status === 'APPROVED' && s.publishedSlug && (
                    <Link href={`/${s.publishedType}/${s.publishedSlug}`} target="_blank" className="text-xs text-primary hover:underline mt-1 inline-block">
                      View published document →
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
