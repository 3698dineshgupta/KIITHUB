'use client'
import { motion } from 'framer-motion'
import { Users, BookOpen, FileText, Eye } from 'lucide-react'

export function StatsSection({ stats }: { stats: { users: number; notes: number; pyqs: number; views: number } }) {
  const items = [
    { label: 'Students', value: stats.users, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Notes', value: stats.notes, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'PYQs', value: stats.pyqs, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Views', value: stats.views, icon: Eye, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  ]
  return (
    <section className="py-12 bg-background border-b">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="text-center">
              <div className={`inline-flex p-3 rounded-xl ${item.bg} mb-3`}><item.icon className={`h-6 w-6 ${item.color}`} /></div>
              <div className="text-3xl font-bold tabular-nums">{(item.value ?? 0).toLocaleString()}+</div>
              <div className="text-sm text-muted-foreground">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
