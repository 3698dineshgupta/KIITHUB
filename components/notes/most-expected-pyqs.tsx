'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Flame, Calendar, Eye, Crown, ArrowRight } from 'lucide-react'
import { useOpenDocument } from '@/hooks/use-open-document'
import { cn, examTypeShort } from '@/lib/utils'

interface MostExpectedPYQ {
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

// A curated (admin-flagged) spotlight, not just another filter on the
// regular grid — deliberately visually distinct (fire gradient, larger
// cards, its own section) so "most expected" reads as a special editorial
// pick rather than one more PYQ among hundreds.
export function MostExpectedPYQs({ pyqs }: { pyqs: MostExpectedPYQ[] }) {
  const handleOpen = useOpenDocument()
  if (!pyqs.length) return null

  return (
    <section className="relative mb-10 overflow-hidden rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-red-950/20 dark:via-orange-950/20 dark:to-amber-950/20">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-red-400/10 blur-3xl" />

      <div className="relative p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-orange-500/30">
            <Flame className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
              Most Expected Questions
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Predicted questions curated for this exam season — high yield, high priority.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pyqs.map((pyq, i) => (
            <motion.div
              key={pyq.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              viewport={{ once: true }}
            >
              <Link href={`/pyq/${pyq.slug}`} onClick={handleOpen(pyq.title)} className="group block h-full">
                <div className="relative h-full rounded-xl border border-orange-200 dark:border-orange-900/50 bg-background/80 backdrop-blur-sm p-4 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1">
                  <div className="absolute top-0 left-0 h-1 w-full rounded-t-xl bg-gradient-to-r from-red-500 to-orange-500" />
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white">
                      <Flame className="h-2.5 w-2.5" />Predicted
                    </span>
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', pyq.examType === 'Mid Semester' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400')}>
                      {examTypeShort(pyq.examType)}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" />{pyq.year}
                    </span>
                    {pyq.isPremium && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Crown className="h-2.5 w-2.5" />Premium
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {pyq.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">{pyq.subject.name} · Sem {pyq.semester.number} · {pyq.branch.shortName}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-orange-100 dark:border-orange-900/40">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{pyq.viewCount} views</span>
                    <span className="flex items-center gap-1 font-medium text-orange-600 dark:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open<ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
