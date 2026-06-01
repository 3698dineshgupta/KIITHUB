'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Eye,
  Bookmark,
  BookmarkCheck,
  Lock,
  Crown,
  Calendar,
  BookOpen,
} from 'lucide-react'
import { PDFMetadata, EXAM_TYPE_LABELS } from '@/types'
import { cn } from '@/lib/utils'

interface PDFCardProps {
  pdf: PDFMetadata
  onBookmark?: () => void
}

export function PDFCard({ pdf, onBookmark }: PDFCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(pdf.isBookmarked || false)
  const [isLoading, setIsLoading] = useState(false)

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsLoading(true)
    try {
      // Call bookmark API
      const res = await fetch('/api/bookmarks', {
        method: isBookmarked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId: pdf.id }),
      })

      if (res.ok) {
        setIsBookmarked(!isBookmarked)
        onBookmark?.()
      }
    } catch (error) {
      console.error('Bookmark error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Link href={`/pdf/${pdf.id}`}>
      <Card
        className={cn(
          'group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1',
          pdf.isPremium &&
            'border-2 border-amber-400 shadow-xl shadow-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/30'
        )}
      >
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    pdf.isPremium
                      ? 'bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30'
                      : 'bg-emerald-100 dark:bg-emerald-900/30'
                  )}
                >
                  {pdf.isPremium ? (
                    <Lock className="h-5 w-5 text-amber-600" />
                  ) : (
                    <FileText className="h-5 w-5 text-emerald-600" />
                  )}
                </div>
                {pdf.isPremium && (
                  <Badge variant="premium" className="gap-1">
                    <Crown className="h-3 w-3" />
                    Premium
                  </Badge>
                )}
              </div>

              <h3 className="font-semibold text-lg text-slate-900 dark:text-white line-clamp-2 group-hover:text-emerald-600 transition-colors">
                {pdf.title}
              </h3>

              {pdf.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-2">
                  {pdf.description}
                </p>
              )}
            </div>

            <button
              onClick={handleBookmark}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-5 w-5 text-emerald-600 fill-emerald-600" />
              ) : (
                <Bookmark className="h-5 w-5 text-slate-400" />
              )}
            </button>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              {pdf.subject}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Sem {pdf.semester}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {EXAM_TYPE_LABELS[pdf.examType]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {pdf.year}
            </Badge>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Eye className="h-4 w-4" />
              <span>{pdf.views.toLocaleString()} views</span>
            </div>

            <Button
              size="sm"
              variant={pdf.isPremium ? 'premium' : 'default'}
              className="gap-2"
            >
              {pdf.isPremium ? (
                <>
                  <Lock className="h-4 w-4" />
                  Preview
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  View PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Premium Glow Effect */}
        {pdf.isPremium && (
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}
      </Card>
    </Link>
  )
}
