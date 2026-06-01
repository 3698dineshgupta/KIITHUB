import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Download, BookOpen, Calendar, HardDrive, FileText, Crown } from 'lucide-react'
import { formatDate, formatBytes } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = { NOTE:'Note', PYQ:'PYQ', SYLLABUS:'Syllabus', LAB_MANUAL:'Lab Manual', ASSIGNMENT:'Assignment' }

export function NoteMetaCard({ note }: { note: any }) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="secondary">{TYPE_LABELS[note.contentType] ?? 'Note'}</Badge>
            <Badge variant="secondary">{note.branch?.shortName}</Badge>
            <Badge variant="secondary">Sem {note.semester?.number}</Badge>
            {note.isPremium && <Badge variant="premium" className="gap-1"><Crown className="h-3 w-3" />Premium</Badge>}
          </div>
          <h1 className="text-2xl font-bold mb-2">{note.title}</h1>
          {note.description && <p className="text-muted-foreground">{note.description}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" />{note.subject?.name}</span>
        <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" />{note.viewCount} views</span>
        <span className="flex items-center gap-1.5"><Download className="h-4 w-4" />{note.downloadCount} downloads</span>
        {note.fileSize && <span className="flex items-center gap-1.5"><HardDrive className="h-4 w-4" />{formatBytes(note.fileSize)}</span>}
        {note.totalPages && <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" />{note.totalPages} pages</span>}
        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDate(note.createdAt)}</span>
      </div>
      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {note.tags.map((t: any) => <span key={t.tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">#{t.tag}</span>)}
        </div>
      )}
    </Card>
  )
}
