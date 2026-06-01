'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BookOpen, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function SemesterGrid({ semesters }: { semesters: any[] }) {
  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2">Browse by Semester</h2>
          <p className="text-muted-foreground">Find resources organized by semester</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {semesters.map((sem, i) => (
            <motion.div key={sem.id} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} viewport={{ once: true }}>
              <Link href={`/notes?semester=${sem.id}`}>
                <Card className="p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group">
                  <div className="text-4xl font-bold text-primary/20 group-hover:text-primary/40 transition-colors">{sem.number}</div>
                  <div className="font-semibold mt-1">Semester {sem.number}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{sem._count.notes} notes</span>
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{sem._count.pyqs} PYQs</span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
