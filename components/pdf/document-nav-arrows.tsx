'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentNavArrowsProps {
  canPrev: boolean
  canNext: boolean
  prevLabel?: string
  nextLabel?: string
  onPrev: () => void
  onNext: () => void
  disabled?: boolean
}

export function DocumentNavArrows({ canPrev, canNext, prevLabel, nextLabel, onPrev, onNext, disabled }: DocumentNavArrowsProps) {
  if (!canPrev && !canNext) return null
  return (
    <>
      {canPrev && (
        <button
          onClick={onPrev}
          disabled={disabled}
          title={prevLabel ? `Previous: ${prevLabel}` : 'Previous material'}
          className={cn(
            'absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-30',
            'flex items-center gap-1.5 pl-2 pr-3 py-2 rounded-full',
            'bg-zinc-900/70 hover:bg-zinc-900/90 text-white backdrop-blur-sm',
            'border border-white/10 shadow-lg transition-all cursor-pointer',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <ChevronLeft className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline text-xs font-medium max-w-[140px] truncate">
            {prevLabel ?? 'Previous'}
          </span>
        </button>
      )}
      {canNext && (
        <button
          onClick={onNext}
          disabled={disabled}
          title={nextLabel ? `Next: ${nextLabel}` : 'Next material'}
          className={cn(
            'absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-30',
            'flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-full',
            'bg-zinc-900/70 hover:bg-zinc-900/90 text-white backdrop-blur-sm',
            'border border-white/10 shadow-lg transition-all cursor-pointer',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <span className="hidden sm:inline text-xs font-medium max-w-[140px] truncate">
            {nextLabel ?? 'Next'}
          </span>
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        </button>
      )}
    </>
  )
}
