'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NoteCard } from '@/components/notes/note-card'

interface Props { title: string; notes: any[]; variant?: 'default' | 'trending' }

export function FeaturedNotes({ title, notes, variant = 'default' }: Props) {
  if (!notes.length) return null
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {variant === 'trending' && <TrendingUp className="h-5 w-5 text-orange-500" />}
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          <Link href="/notes"><Button variant="ghost" size="sm" className="gap-1">View all<ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {notes.map((note, i) => (
            <motion.div key={note.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} viewport={{ once: true }}>
              <NoteCard note={note} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
