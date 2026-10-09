'use client'
import { Check, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubjectDocumentGroup, SubjectDocumentItem } from '@/lib/subject-documents'

export interface SubjectDocumentsSelectHandler {
  (item: { type: 'note' | 'pyq'; slug: string }): void
}

interface SubjectDocumentsListProps {
  groups: SubjectDocumentGroup[]
  current: { type: 'note' | 'pyq'; slug: string }
  onSelect: SubjectDocumentsSelectHandler
  disabled?: boolean
}

// Bare grouped list, no Card/header — rendered inside the toolbar popover in
// pdf-viewer.tsx, which supplies its own floating shell (it has to render
// inside PDFViewer's own fullscreen container to stay visible in fullscreen,
// so it owns its own header rather than wrapping this in a second one).
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
