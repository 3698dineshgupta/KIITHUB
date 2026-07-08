'use client'
import { Eye, BookOpen, Lock, Crown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatBytes } from '@/lib/utils'
import type { SuggestionItem } from '@/lib/recommendations'

const TYPE_COLORS: Record<string, string> = {
  NOTE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PYQ: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SYLLABUS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LAB_MANUAL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ASSIGNMENT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

function typeColor(item: SuggestionItem): string {
  if (item.type === 'pyq') return TYPE_COLORS.PYQ
  const key = item.typeLabel === 'Notes' ? 'NOTE' : item.typeLabel.replace(' ', '_').toUpperCase()
  return TYPE_COLORS[key] ?? TYPE_COLORS.NOTE
}

interface SuggestedMaterialsProps {
  suggestions: SuggestionItem[]
  onSelect: (item: SuggestionItem) => void
  disabled?: boolean
}

export function SuggestedMaterials({ suggestions, onSelect, disabled }: SuggestedMaterialsProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-3">Suggested Materials</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
        {suggestions.map(item => (
          <button
            key={`${item.type}-${item.slug}`}
            onClick={() => onSelect(item)}
            disabled={disabled}
            className="text-left flex-shrink-0 w-64 sm:w-auto disabled:opacity-60 disabled:cursor-wait"
          >
            <Card className={cn('h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group overflow-hidden', item.isPremium && 'border-amber-300 dark:border-amber-700')}>
              {item.isPremium && <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />}
              <CardContent className="p-4 flex flex-col h-full">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', typeColor(item))}>
                    {item.typeLabel}
                  </span>
                  {item.isPremium && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Crown className="h-3 w-3" />Premium
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{item.subjectName}</span>
                  <span>Sem {item.semesterNumber}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{item.viewCount} views</span>
                  <div className="flex items-center gap-2">
                    {item.fileSize && <span>{formatBytes(item.fileSize)}</span>}
                    {item.isPremium && <Lock className="h-3 w-3 text-amber-500" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}
