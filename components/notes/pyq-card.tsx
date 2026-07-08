'use client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, Crown, Lock, FileText, Calendar } from 'lucide-react'
import { useOpenDocument } from '@/hooks/use-open-document'

interface PYQCardProps {
  pyq: {
    id: string
    slug: string
    title: string
    year: number
    examType: string
    isPremium: boolean
    viewCount: number
    subject: { name: string }
    semester: { number: number }
    branch: { shortName: string }
  }
}

export function PYQCard({ pyq }: PYQCardProps) {
  const handleOpen = useOpenDocument()

  return (
    <Link href={`/pyq/${pyq.slug}`} onClick={handleOpen(pyq.title)}>
      <Card className={`h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group overflow-hidden ${pyq.isPremium ? 'border-amber-300 dark:border-amber-700' : ''}`}>
        {pyq.isPremium && <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />}
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">PYQ</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" />{pyq.year}
            </span>
            {pyq.isPremium && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Crown className="h-3 w-3" />Premium
              </span>
            )}
          </div>

          <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">{pyq.title}</h3>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{pyq.subject.name}</span>
            <span>Sem {pyq.semester.number}</span>
            <span>{pyq.branch.shortName}</span>
          </div>

          <div className="text-xs text-muted-foreground mb-1">{pyq.examType}</div>

          <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{pyq.viewCount}</span>
            </div>
            {pyq.isPremium && <Lock className="h-3 w-3 text-amber-500" />}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
