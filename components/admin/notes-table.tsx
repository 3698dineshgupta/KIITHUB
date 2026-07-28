'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Trash2, Eye, Crown, Loader2, ExternalLink, Search } from 'lucide-react'
import { formatDate, formatBytes } from '@/lib/utils'
import Link from 'next/link'

const TYPE_COLORS: Record<string, string> = {
  NOTE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PYQ: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SYLLABUS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LAB_MANUAL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ASSIGNMENT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

export function AdminNotesTable({ notes, total, page, search }: { notes: any[]; total: number; page: number; search?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(search ?? '')
  const [loading, setLoading] = useState<string | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/admin/notes?search=${encodeURIComponent(query)}`)
  }

  const doDelete = async (id: string) => {
    if (!confirm('Delete this note? This will also remove it from Telegram.')) return
    setLoading('del_' + id)
    try {
      await fetch(`/api/admin/notes/${id}`, { method: 'DELETE' })
      router.refresh()
    } catch {}
    setLoading(null)
  }

  const togglePremium = async (id: string, current: boolean) => {
    setLoading('prem_' + id)
    try {
      await fetch(`/api/admin/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPremium: !current }),
      })
      router.refresh()
    } catch {}
    setLoading(null)
  }

  const togglePublish = async (id: string, current: boolean) => {
    setLoading('pub_' + id)
    try {
      await fetch(`/api/admin/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !current }),
      })
      router.refresh()
    } catch {}
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title or subject..." value={query} onChange={e => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Button type="submit" size="sm">Search</Button>
      </form>

      <div className="space-y-2">
      {notes.map(note => (
        <Card key={note.id} className="p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[note.contentType] ?? TYPE_COLORS.NOTE}`}>
                  {note.contentType.replace('_', ' ')}
                </span>
                {note.isPremium && <Badge variant="premium" className="text-xs gap-1"><Crown className="h-3 w-3" />Premium</Badge>}
                {!note.isPublished && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                <span className="text-xs text-muted-foreground">{note.branch.shortName} · Sem {note.semester.number}</span>
              </div>

              <h3 className="font-medium text-sm mb-1 line-clamp-1">{note.title}</h3>

              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>{note.subject.name}</span>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{note.viewCount} views</span>
                {note.fileSize && <span>{formatBytes(note.fileSize)}</span>}
                <span>{formatDate(note.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href={`/notes/${note.slug}`} target="_blank">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Preview">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => router.push(`/admin/notes/${note.id}`)}
              >
                Edit
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={!!loading}
                onClick={() => togglePremium(note.id, note.isPremium)}
              >
                {loading === 'prem_' + note.id ? <Loader2 className="h-3 w-3 animate-spin" /> :
                  note.isPremium ? 'Make Free' : <><Crown className="h-3 w-3 mr-1" />Make Premium</>
                }
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={!!loading}
                onClick={() => togglePublish(note.id, note.isPublished)}
              >
                {loading === 'pub_' + note.id ? <Loader2 className="h-3 w-3 animate-spin" /> :
                  note.isPublished ? 'Unpublish' : 'Publish'
                }
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:border-destructive"
                disabled={!!loading}
                onClick={() => doDelete(note.id)}
                title="Delete"
              >
                {loading === 'del_' + note.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </Card>
      ))}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
        <span>Showing {notes.length} of {total}</span>
        <div className="flex gap-2">
          {page > 1 && <Button variant="outline" size="sm" onClick={() => router.push(`/admin/notes?page=${page-1}`)}>Previous</Button>}
          {notes.length === 20 && <Button variant="outline" size="sm" onClick={() => router.push(`/admin/notes?page=${page+1}`)}>Next</Button>}
        </div>
      </div>
    </div>
  )
}
