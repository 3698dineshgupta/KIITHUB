'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, BookOpen, Lock, Crown, Bookmark, BookmarkCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime, formatBytes } from '@/lib/utils'
import { useState } from 'react'
import { useOpenDocument } from '@/hooks/use-open-document'

const TYPE_COLORS: Record<string, string> = {
  NOTE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PYQ: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SYLLABUS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LAB_MANUAL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ASSIGNMENT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

const TYPE_LABELS: Record<string, string> = {
  NOTE: 'Note', PYQ: 'PYQ', SYLLABUS: 'Syllabus', LAB_MANUAL: 'Lab Manual', ASSIGNMENT: 'Assignment',
}

interface NoteCardProps { note: any; showBookmark?: boolean }

export function NoteCard({ note, showBookmark = false }: NoteCardProps) {
  const [bookmarked, setBookmarked] = useState(note.isBookmarked ?? false)
  const [loading, setLoading] = useState(false)
  const handleOpen = useOpenDocument()

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setLoading(true)
    try {
      const method = bookmarked ? 'DELETE' : 'POST'
      await fetch('/api/bookmarks', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noteId: note.id }) })
      setBookmarked(!bookmarked)
    } catch {}
    setLoading(false)
  }

  return (
    <Link href={note.contentType === 'PYQ' ? `/pyq/${note.slug}` : `/notes/${note.slug}`} onClick={handleOpen(note.title)}>
      <Card className={cn('h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group overflow-hidden', note.isPremium && 'border-amber-300 dark:border-amber-700')}>
        {note.isPremium && (
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
        )}
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', TYPE_COLORS[note.contentType] ?? TYPE_COLORS.NOTE)}>
                {TYPE_LABELS[note.contentType] ?? 'Note'}
              </span>
              {note.isPremium && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Crown className="h-3 w-3" />Premium
                </span>
              )}
            </div>
            {showBookmark && (
              <button onClick={toggleBookmark} disabled={loading} className="p-1 rounded-md hover:bg-accent transition-colors flex-shrink-0">
                {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
              </button>
            )}
          </div>

          <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {note.title}
          </h3>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{note.subject?.name}</span>
            <span>Sem {note.semester?.number}</span>
            <span>{note.branch?.shortName}</span>
          </div>

          {note.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{note.description}</p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{note.viewCount} views</span>
            </div>
            <div className="flex items-center gap-2">
              {note.fileSize && <span>{formatBytes(note.fileSize)}</span>}
              {note.isPremium && <Lock className="h-3 w-3 text-amber-500" />}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
