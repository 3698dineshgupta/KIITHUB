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
import { Loader2, Send, ExternalLink, Image as ImageIcon, Video } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { BUG_CATEGORIES, BUG_SEVERITIES, BUG_STATUSES, BUG_CATEGORY_LABELS, BUG_STATUS_LABELS } from '@/lib/bugs'
import type { BadgeProps } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, BadgeProps['variant']> = {
  SUBMITTED: 'secondary', UNDER_REVIEW: 'warning', IN_PROGRESS: 'warning', FIXED: 'success', CLOSED: 'secondary',
}
const SEVERITY_BADGE: Record<string, BadgeProps['variant']> = {
  LOW: 'secondary', MEDIUM: 'warning', HIGH: 'destructive', CRITICAL: 'destructive',
}

interface AdminBugReport {
  id: string
  bugId: string
  title: string
  description: string
  stepsToReproduce: string | null
  expectedBehavior: string | null
  actualBehavior: string | null
  category: string
  severity: string
  status: string
  priority: number | null
  internalNotes: string | null
  pageUrl: string | null
  browserInfo: string | null
  deviceInfo: string | null
  os: string | null
  screenResolution: string | null
  screenshotUrl: string | null
  recordingUrl: string | null
  contactEmail: string | null
  createdAt: string | Date
  user: { id: string; name: string; email: string } | null
}

export function AdminBugsTable({ reports }: { reports: AdminBugReport[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [severity, setSeverity] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [active, setActive] = useState<AdminBugReport | null>(null)

  const filtered = useMemo(() => reports.filter(r => {
    if (category !== 'ALL' && r.category !== category) return false
    if (severity !== 'ALL' && r.severity !== severity) return false
    if (status !== 'ALL' && r.status !== status) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!r.title.toLowerCase().includes(q) && !r.bugId.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false
    }
    return true
  }), [reports, category, severity, status, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, ID, description..." className="max-w-xs" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {BUG_CATEGORIES.map(c => <SelectItem key={c} value={c}>{BUG_CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Severities</SelectItem>
            {BUG_SEVERITIES.map(s => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {BUG_STATUSES.map(s => <SelectItem key={s} value={s}>{BUG_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No matching reports</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive(r)}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <code className="text-xs text-muted-foreground font-mono">{r.bugId}</code>
                    <Badge variant={STATUS_BADGE[r.status]} className="text-xs">{BUG_STATUS_LABELS[r.status]}</Badge>
                    <Badge variant={SEVERITY_BADGE[r.severity]} className="text-xs">{r.severity}</Badge>
                    <Badge variant="secondary" className="text-xs">{BUG_CATEGORY_LABELS[r.category]}</Badge>
                    {r.priority != null && <Badge variant="outline" className="text-xs">Priority {r.priority}</Badge>}
                  </div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.user ? `${r.user.name} (${r.user.email})` : 'Anonymous'}{r.contactEmail ? ` · ${r.contactEmail}` : ''} · {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2 text-muted-foreground">
                  {r.screenshotUrl && <ImageIcon className="h-4 w-4" />}
                  {r.recordingUrl && <Video className="h-4 w-4" />}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BugDetailDialog key={active?.id ?? 'none'} report={active} onClose={() => setActive(null)} onUpdated={() => { setActive(null); router.refresh() }} />
    </div>
  )
}

function BugDetailDialog({ report, onClose, onUpdated }: { report: AdminBugReport | null; onClose: () => void; onUpdated: () => void }) {
  const [status, setStatus] = useState(report?.status ?? 'SUBMITTED')
  const [priority, setPriority] = useState(report?.priority?.toString() ?? '')
  const [internalNotes, setInternalNotes] = useState(report?.internalNotes ?? '')
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)
  const [replying, setReplying] = useState(false)

  if (!report) return null

  const save = async () => {
    setSaving(true)
    try {
      await fetch(`/api/admin/bugs/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, priority: priority ? Number(priority) : null, internalNotes }),
      })
      onUpdated()
    } catch {}
    setSaving(false)
  }

  const sendReply = async () => {
    if (!reply.trim()) return
    setReplying(true)
    try {
      await fetch(`/api/bugs/${report.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      })
      setReply('')
      onUpdated()
    } catch {}
    setReplying(false)
  }

  return (
    <Dialog open={!!report} onOpenChange={open => !open && onClose()}>
      <DialogContent key={report.id} className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono text-muted-foreground">{report.bugId}</code>{report.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p>{report.description}</p>
          {report.stepsToReproduce && <div><p className="font-medium mb-1">Steps to Reproduce</p><p className="text-muted-foreground whitespace-pre-line">{report.stepsToReproduce}</p></div>}
          <div className="grid grid-cols-2 gap-3">
            {report.expectedBehavior && <div><p className="font-medium mb-1">Expected</p><p className="text-muted-foreground">{report.expectedBehavior}</p></div>}
            {report.actualBehavior && <div><p className="font-medium mb-1">Actual</p><p className="text-muted-foreground">{report.actualBehavior}</p></div>}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground rounded-lg border p-3">
            {report.pageUrl && <div className="col-span-2 flex items-center gap-1 truncate"><ExternalLink className="h-3 w-3 flex-shrink-0" /><a href={report.pageUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{report.pageUrl}</a></div>}
            {report.browserInfo && <div>Browser: {report.browserInfo}</div>}
            {report.os && <div>OS: {report.os}</div>}
            {report.deviceInfo && <div>Device: {report.deviceInfo}</div>}
            {report.screenResolution && <div>Resolution: {report.screenResolution}</div>}
          </div>

          {(report.screenshotUrl || report.recordingUrl) && (
            <div className="flex gap-3">
              {report.screenshotUrl && <a href={report.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline"><ImageIcon className="h-3.5 w-3.5" />View Screenshot</a>}
              {report.recordingUrl && <a href={report.recordingUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline"><Video className="h-3.5 w-3.5" />View Recording</a>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div>
              <Label className="mb-1.5 block text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BUG_STATUSES.map(s => <SelectItem key={s} value={s}>{BUG_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Priority (1-5)</Label>
              <Input type="number" min={1} max={5} value={priority} onChange={e => setPriority(e.target.value)} placeholder="Unset" />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Internal Notes</Label>
            <textarea
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              rows={2}
              placeholder="Notes visible to admins/moderators only..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            />
          </div>

          <Button className="w-full gap-2" disabled={saving} onClick={save}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save Changes
          </Button>

          {report.user && (
            <div className="pt-3 border-t space-y-2">
              <Label className="text-xs">Reply to Reporter</Label>
              <div className="flex gap-2">
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button size="sm" disabled={replying || !reply.trim()} onClick={sendReply}>
                  {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
