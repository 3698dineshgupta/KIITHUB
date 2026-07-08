'use client'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Loader2, Send } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { BUG_CATEGORY_LABELS, BUG_STATUS_LABELS } from '@/lib/bugs'
import type { BadgeProps } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, BadgeProps['variant']> = {
  SUBMITTED: 'secondary', UNDER_REVIEW: 'warning', IN_PROGRESS: 'warning', FIXED: 'success', CLOSED: 'secondary',
}

interface BugReportSummary {
  id: string
  bugId: string
  title: string
  category: string
  severity: string
  status: string
  description: string
  createdAt: string
}

interface Comment { id: string; message: string; isAdmin: boolean; createdAt: string; author: { name: string } | null }

export function MyBugReports() {
  const [reports, setReports] = useState<BugReportSummary[] | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentDraft, setCommentDraft] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/bugs', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setReports(data.reports)
        }
      } catch {}
    })()
  }, [])

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!comments[id]) {
      try {
        const res = await fetch(`/api/bugs/${id}`)
        if (res.ok) {
          const data = await res.json()
          setComments(prev => ({ ...prev, [id]: data.report.comments }))
        }
      } catch {}
    }
  }

  const submitComment = async (id: string) => {
    if (!commentDraft.trim()) return
    setPosting(true)
    try {
      const res = await fetch(`/api/bugs/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commentDraft.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => ({ ...prev, [id]: [...(prev[id] ?? []), { ...data.comment, author: { name: 'You' } }] }))
        setCommentDraft('')
      }
    } catch {}
    setPosting(false)
  }

  if (reports === null) {
    return <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
  }

  if (reports.length === 0) {
    return <Card className="p-12 text-center"><p className="text-muted-foreground">You haven&apos;t submitted any bug reports yet.</p></Card>
  }

  return (
    <div className="space-y-3">
      {reports.map(r => (
        <Card key={r.id} className="p-4">
          <button className="w-full text-left flex items-start justify-between gap-3" onClick={() => toggleExpand(r.id)}>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <code className="text-xs text-muted-foreground font-mono">{r.bugId}</code>
                <Badge variant={STATUS_BADGE[r.status]} className="text-xs">{BUG_STATUS_LABELS[r.status]}</Badge>
                <Badge variant="secondary" className="text-xs">{BUG_CATEGORY_LABELS[r.category]}</Badge>
              </div>
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-1">Submitted {formatDate(r.createdAt)}</p>
            </div>
            {expanded === r.id ? <ChevronUp className="h-4 w-4 flex-shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 mt-1" />}
          </button>

          {expanded === r.id && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <p className="text-sm text-muted-foreground">{r.description}</p>

              <div className="space-y-2">
                {(comments[r.id] ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No comments yet.</p>
                ) : (
                  (comments[r.id] ?? []).map(c => (
                    <div key={c.id} className={cn('rounded-lg p-2.5 text-sm', c.isAdmin ? 'bg-primary/10' : 'bg-muted')}>
                      <p className="text-xs font-medium mb-0.5">{c.isAdmin ? 'KIIT Hub Team' : (c.author?.name ?? 'You')}</p>
                      <p>{c.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={commentDraft}
                  onChange={e => setCommentDraft(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onKeyDown={e => { if (e.key === 'Enter') submitComment(r.id) }}
                />
                <Button size="sm" disabled={posting || !commentDraft.trim()} onClick={() => submitComment(r.id)}>
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
