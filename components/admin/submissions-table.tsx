'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { BadgeProps } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, BadgeProps['variant']> = {
  PENDING: 'secondary', APPROVED: 'success', REJECTED: 'destructive',
}
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const

interface AdminSubmission {
  id: string
  title: string
  contentType: string
  examType: string | null
  subjectName: string
  academicBranch: string
  academicSemester: string
  status: string
  rejectionReason: string | null
  duplicateNote: string | null
  publishedType: string | null
  publishedSlug: string | null
  telegramSent: boolean
  createdAt: string | Date
  user: { id: string; name: string; email: string }
}

export function AdminSubmissionsTable({ submissions }: { submissions: AdminSubmission[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [active, setActive] = useState<AdminSubmission | null>(null)

  const filtered = useMemo(() => submissions.filter(s => {
    if (status !== 'ALL' && s.status !== status) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!s.title.toLowerCase().includes(q) && !s.user.email.toLowerCase().includes(q) && !s.subjectName.toLowerCase().includes(q)) return false
    }
    return true
  }), [submissions, status, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, subject, uploader email..." className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No matching submissions</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <Card key={s.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive(s)}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={STATUS_BADGE[s.status]} className="text-xs">{s.status}</Badge>
                    <Badge variant="secondary" className="text-xs">{s.contentType}{s.examType ? ` · ${s.examType}` : ''}</Badge>
                    {s.duplicateNote && (
                      <Badge variant="warning" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />Possible Duplicate</Badge>
                    )}
                    {!s.telegramSent && <Badge variant="destructive" className="text-xs">Telegram delivery failed</Badge>}
                  </div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.user.name} ({s.user.email}) · {s.subjectName} · {s.academicBranch} Sem {s.academicSemester} · {formatDate(s.createdAt)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SubmissionDetailDialog key={active?.id ?? 'none'} submission={active} onClose={() => setActive(null)} onUpdated={() => { setActive(null); router.refresh() }} />
    </div>
  )
}

function SubmissionDetailDialog({ submission, onClose, onUpdated }: { submission: AdminSubmission | null; onClose: () => void; onUpdated: () => void }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState('')

  if (!submission) return null

  const act = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !reason.trim()) {
      setError('Please give a rejection reason.')
      return
    }
    setBusy(action)
    setError('')
    try {
      const res = await fetch(`/api/admin/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'approve' ? { action } : { action, reason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const reviewed = submission.status !== 'PENDING'

  return (
    <Dialog open={!!submission} onOpenChange={open => !open && onClose()}>
      <DialogContent key={submission.id} className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{submission.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={STATUS_BADGE[submission.status]} className="text-xs">{submission.status}</Badge>
            <Badge variant="secondary" className="text-xs">{submission.contentType}{submission.examType ? ` · ${submission.examType}` : ''}</Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            Uploaded by {submission.user.name} ({submission.user.email})<br />
            {submission.subjectName} · {submission.academicBranch} Sem {submission.academicSemester} · {formatDate(submission.createdAt)}
          </p>

          {submission.duplicateNote && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Possible duplicate</p>
                <p>{submission.duplicateNote}</p>
              </div>
            </div>
          )}

          {!submission.telegramSent && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs">
              Delivery to Telegram failed for this submission — it can only be reviewed here.
            </div>
          )}

          {reviewed ? (
            <div className="pt-2 border-t text-xs text-muted-foreground">
              {submission.status === 'APPROVED' && submission.publishedSlug && (
                <Link href={`/${submission.publishedType}/${submission.publishedSlug}`} target="_blank" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" />View published document
                </Link>
              )}
              {submission.status === 'REJECTED' && submission.rejectionReason && <p>Reason: {submission.rejectionReason}</p>}
            </div>
          ) : (
            <div className="pt-3 border-t space-y-3">
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button className="w-full gap-2" disabled={!!busy} onClick={() => act('approve')}>
                {busy === 'approve' && <Loader2 className="h-4 w-4 animate-spin" />}Approve — publish live
              </Button>
              <div>
                <Label className="mb-1.5 block text-xs">Rejection reason</Label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Duplicate of an existing document, poor scan quality..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                />
              </div>
              <Button variant="outline" className="w-full gap-2" disabled={!!busy} onClick={() => act('reject')}>
                {busy === 'reject' && <Loader2 className="h-4 w-4 animate-spin" />}Reject
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
