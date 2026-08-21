'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, CheckCircle, Send, ExternalLink, Inbox } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { REQUEST_STATUS_LABELS } from '@/lib/requests'
import type { BadgeProps } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, BadgeProps['variant']> = {
  PENDING: 'secondary', IN_PROGRESS: 'warning', FULFILLED: 'success', REJECTED: 'destructive',
}

interface ContentRequestSummary {
  id: string
  requestCode: string
  title: string
  description: string
  branch: string | null
  semester: string | null
  status: string
  adminResponse: string | null
  fulfilledUrl: string | null
  createdAt: string
}

export function RequestHub() {
  const [requests, setRequests] = useState<ContentRequestSummary[] | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [branch, setBranch] = useState('')
  const [semester, setSemester] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successCode, setSuccessCode] = useState<string | null>(null)

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/requests', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests)
      }
    } catch {}
  }

  useEffect(() => { loadRequests() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 3 || description.trim().length < 10) {
      setError('Please provide a title and a description (at least 10 characters).')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), branch: branch.trim() || undefined, semester: semester.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit request')
      setSuccessCode(data.requestCode)
      setTitle(''); setDescription(''); setBranch(''); setSemester('')
      loadRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <Card className="p-6 h-fit">
        <h2 className="font-semibold text-lg mb-1">Request Content</h2>
        <p className="text-sm text-muted-foreground mb-5">Can&apos;t find a specific question paper, note, or syllabus? Ask us to source it.</p>

        {successCode && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 mb-4 text-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Request submitted! Your tracking ID is <code className="px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 font-mono">{successCode}</code>.</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="req-title" className="mb-1.5 block">What do you need?</Label>
            <Input id="req-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. DSA Endsem 2023 PYQ" required maxLength={150} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="req-branch" className="mb-1.5 block">Branch (optional)</Label>
              <Input id="req-branch" value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. CSE" />
            </div>
            <div>
              <Label htmlFor="req-semester" className="mb-1.5 block">Semester (optional)</Label>
              <Input id="req-semester" value={semester} onChange={e => setSemester(e.target.value)} placeholder="e.g. 5" />
            </div>
          </div>
          <div>
            <Label htmlFor="req-description" className="mb-1.5 block">Details</Label>
            <textarea
              id="req-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Subject, exam type, year, or anything else that helps us find it..."
              rows={4}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Request
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="font-semibold text-lg mb-3">Your Requests</h2>
        {requests === null ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
        ) : requests.length === 0 ? (
          <Card className="p-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">You haven&apos;t submitted any requests yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                  <code className="text-xs text-muted-foreground font-mono">{r.requestCode}</code>
                  <Badge variant={STATUS_BADGE[r.status]} className="text-xs">{REQUEST_STATUS_LABELS[r.status]}</Badge>
                </div>
                <p className="font-medium text-sm">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                {(r.branch || r.semester) && (
                  <p className="text-xs text-muted-foreground mt-1">{[r.branch, r.semester ? `Sem ${r.semester}` : null].filter(Boolean).join(' · ')}</p>
                )}
                {r.adminResponse && (
                  <div className="mt-2 rounded-lg bg-primary/10 p-2.5 text-xs">
                    <p className="font-medium mb-0.5">KIIT Hub Team</p>
                    <p>{r.adminResponse}</p>
                  </div>
                )}
                {r.fulfilledUrl && (
                  <a href={r.fulfilledUrl} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" />View content
                  </a>
                )}
                <p className="text-xs text-muted-foreground mt-2">Submitted {formatDate(r.createdAt)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
