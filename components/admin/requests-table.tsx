'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { REQUEST_STATUSES, REQUEST_STATUS_LABELS } from '@/lib/requests'
import type { BadgeProps } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, BadgeProps['variant']> = {
  PENDING: 'secondary', IN_PROGRESS: 'warning', FULFILLED: 'success', REJECTED: 'destructive',
}

interface AdminContentRequest {
  id: string
  requestCode: string
  title: string
  description: string
  branch: string | null
  semester: string | null
  status: string
  adminResponse: string | null
  fulfilledUrl: string | null
  createdAt: string | Date
  user: { id: string; name: string; email: string }
}

export function AdminRequestsTable({ requests }: { requests: AdminContentRequest[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [active, setActive] = useState<AdminContentRequest | null>(null)

  const filtered = useMemo(() => requests.filter(r => {
    if (status !== 'ALL' && r.status !== status) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!r.title.toLowerCase().includes(q) && !r.requestCode.toLowerCase().includes(q) && !r.user.email.toLowerCase().includes(q)) return false
    }
    return true
  }), [requests, status, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, ID, requester email..." className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {REQUEST_STATUSES.map(s => <SelectItem key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No matching requests</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive(r)}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <code className="text-xs text-muted-foreground font-mono">{r.requestCode}</code>
                    <Badge variant={STATUS_BADGE[r.status]} className="text-xs">{REQUEST_STATUS_LABELS[r.status]}</Badge>
                    {(r.branch || r.semester) && <Badge variant="secondary" className="text-xs">{[r.branch, r.semester ? `Sem ${r.semester}` : null].filter(Boolean).join(' · ')}</Badge>}
                  </div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.user.name} ({r.user.email}) · {formatDate(r.createdAt)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <RequestDetailDialog key={active?.id ?? 'none'} request={active} onClose={() => setActive(null)} onUpdated={() => { setActive(null); router.refresh() }} />
    </div>
  )
}

function RequestDetailDialog({ request, onClose, onUpdated }: { request: AdminContentRequest | null; onClose: () => void; onUpdated: () => void }) {
  const [status, setStatus] = useState(request?.status ?? 'PENDING')
  const [adminResponse, setAdminResponse] = useState(request?.adminResponse ?? '')
  const [fulfilledUrl, setFulfilledUrl] = useState(request?.fulfilledUrl ?? '')
  const [saving, setSaving] = useState(false)

  if (!request) return null

  const save = async () => {
    setSaving(true)
    try {
      await fetch(`/api/admin/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminResponse, fulfilledUrl: fulfilledUrl || null }),
      })
      onUpdated()
    } catch {}
    setSaving(false)
  }

  return (
    <Dialog open={!!request} onOpenChange={open => !open && onClose()}>
      <DialogContent key={request.id} className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono text-muted-foreground">{request.requestCode}</code>{request.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p>{request.description}</p>
          <p className="text-xs text-muted-foreground">Requested by {request.user.name} ({request.user.email})</p>
          {(request.branch || request.semester) && (
            <p className="text-xs text-muted-foreground">{[request.branch, request.semester ? `Sem ${request.semester}` : null].filter(Boolean).join(' · ')}</p>
          )}

          <div>
            <Label className="mb-1.5 block text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REQUEST_STATUSES.map(s => <SelectItem key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Fulfilled Content URL (optional)</Label>
            <Input value={fulfilledUrl} onChange={e => setFulfilledUrl(e.target.value)} placeholder="/notes/some-slug" />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Response to Requester</Label>
            <textarea
              value={adminResponse}
              onChange={e => setAdminResponse(e.target.value)}
              rows={3}
              placeholder="Shown to the student (and emailed if you mark this Fulfilled or Rejected)..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            />
          </div>

          <Button className="w-full gap-2" disabled={saving} onClick={save}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
