'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, BookOpen, FileText, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function HeroSection() {
  const [query, setQuery] = useState('')
  const router = useRouter()
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/notes?search=${encodeURIComponent(query.trim())}`)
  }
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 py-20 md:py-32">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Free &amp; Premium Study Materials
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Your Complete{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Study Hub
            </span>
            <br />for KIIT Students
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Access notes, PYQs, lab manuals, and study materials. Calculate your SGPA/CGPA. All in one place.
          </p>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-10">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes, subjects, PYQs..." className="w-full h-12 pl-10 pr-4 rounded-xl border bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
            </div>
            <Button type="submit" size="lg" className="h-12 px-6 rounded-xl">Search</Button>
          </form>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/notes"><Button size="lg" variant="outline" className="gap-2 rounded-xl"><BookOpen className="h-5 w-5" />Browse Notes</Button></Link>
            <Link href="/pyq"><Button size="lg" variant="outline" className="gap-2 rounded-xl"><FileText className="h-5 w-5" />Previous Year Qs</Button></Link>
            <Link href="/premium"><Button size="lg" variant="premium" className="gap-2 rounded-xl"><Sparkles className="h-5 w-5" />Get Premium</Button></Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
