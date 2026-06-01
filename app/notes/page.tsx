import { Suspense } from 'react'
import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { NotesFilters } from '@/components/notes/notes-filters'
import { NotesList } from '@/components/notes/notes-list'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Notes & Study Materials', description: 'Browse all notes, lab manuals, assignments and study materials.' }

export default async function NotesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const resolvedSearchParams = await searchParams
  const [branches, semesters, subjects] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.semester.findMany({ orderBy: { number: 'asc' } }),
    prisma.subject.findMany({ orderBy: { name: 'asc' }, include: { branch: true, semester: true } }),
  ])
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notes & Study Materials</h1>
        <p className="text-muted-foreground">Browse free and premium study materials organized by semester and subject.</p>
      </div>
      <NotesFilters branches={branches} semesters={semesters} subjects={subjects} />
      <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-52 rounded-xl"/>)}</div>}>
        <NotesList searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  )
}
