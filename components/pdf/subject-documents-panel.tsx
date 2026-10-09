'use client'
import { useState } from 'react'
import { Check, ChevronDown, Crown, FileStack } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SubjectDocumentGroup, SubjectDocumentItem } from '@/lib/subject-documents'

export interface SubjectDocumentsSelectHandler {
  (item: { type: 'note' | 'pyq'; slug: string }): void
}

interface SubjectDocumentsPanelProps {
  subjectName: string
  groups: SubjectDocumentGroup[]
  current: { type: 'note' | 'pyq'; slug: string }
  onSelect: SubjectDocumentsSelectHandler
  disabled?: boolean
}

// All documents for the subject currently on screen, grouped the way they're
// categorized everywhere else (Syllabus / Notes / Lab Manual / Assignment /
// Past Questions) — so a reader doesn't have to leave the viewer and go back
// to the subject's listing page to find a sibling document. Backed by
// getSubjectDocuments, which is exhaustive and un-ranked by design (unlike
// Suggested Materials below it), so nothing in the subject is ever missing
// from here for scoring too low.
export function SubjectDocumentsPanel({ subjectName, groups, current, onSelect, disabled }: SubjectDocumentsPanelProps) {
  const [open, setOpen] = useState(true)
  const total = groups.reduce((sum, g) => sum + g.items.length, 0)
  if (total === 0) return null

  return (
    <Card className="p-4 sm:p-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileStack className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="font-semibold text-sm truncate">Documents</span>
          <Badge variant="secondary" className="flex-shrink-0">{total}</Badge>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">· {subjectName}</span>
        </div>
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-3 max-h-80 overflow-y-auto pr-1">
          <SubjectDocumentsList groups={groups} current={current} onSelect={onSelect} disabled={disabled} />
        </div>
      )}
    </Card>
  )
}

interface SubjectDocumentsListProps {
  groups: SubjectDocumentGroup[]
  current: { type: 'note' | 'pyq'; slug: string }
  onSelect: SubjectDocumentsSelectHandler
  disabled?: boolean
}

// Bare grouped list, no Card/header/collapse — shared between the inline
// panel above and the toolbar popover in pdf-viewer.tsx, which needs its own
// floating shell (it has to render inside PDFViewer's own fullscreen
// container to stay visible in fullscreen; a Card here would double up).
export function SubjectDocumentsList({ groups, current, onSelect, disabled }: SubjectDocumentsListProps) {
  return (
    <div className="space-y-3">
      {groups.map(group => (
        <div key={group.label}>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {group.label} · {group.items.length}
          </p>
          <div className="space-y-0.5">
            {group.items.map(item => (
              <DocRow
                key={`${item.type}-${item.slug}`}
                item={item}
                active={item.type === current.type && item.slug === current.slug}
                disabled={disabled}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DocRow({
  item,
  active,
  disabled,
  onSelect,
}: {
  item: SubjectDocumentItem
  active: boolean
  disabled?: boolean
  onSelect: (item: { type: 'note' | 'pyq'; slug: string }) => void
}) {
  return (
    <button
      onClick={() => !active && onSelect(item)}
      disabled={disabled}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors disabled:opacity-60 disabled:cursor-wait',
        active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
      )}
    >
      <span className="truncate min-w-0 text-left">{item.title}</span>
      <span className="flex items-center gap-1.5 flex-shrink-0 text-xs text-muted-foreground">
        {item.totalPages ? <span>{item.totalPages} pp</span> : item.isPremium ? <Crown className="h-3 w-3 text-amber-500" /> : null}
        {active && <Check className="h-3.5 w-3.5 text-primary" />}
      </span>
    </button>
  )
}
