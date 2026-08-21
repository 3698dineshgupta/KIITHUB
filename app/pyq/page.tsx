import { Suspense } from 'react'
import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { NotesFilters } from '@/components/notes/notes-filters'
import { PYQList } from '@/components/notes/pyq-list'
import { MostExpectedPYQs } from '@/components/notes/most-expected-pyqs'
import { Skeleton } from '@/components/ui/skeleton'
export const metadata: Metadata = {
  title: 'Previous Year Questions',
  description: 'Browse all PYQs organized by year, semester and subject.',
  alternates: { canonical: '/pyq' },
  openGraph: {
    title: 'Previous Year Questions | KIIT Hub',
    description: 'Browse all PYQs organized by year, semester and subject.',
    url: '/pyq',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Previous Year Questions | KIIT Hub',
    description: 'Browse all PYQs organized by year, semester and subject.',
  },
}
export const dynamic = "force-dynamic";
export default async function PYQPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const resolvedSearchParams = await searchParams
  const [branches, semesters, subjects, mostExpected] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.semester.findMany({ orderBy: { number: 'asc' } }),
    prisma.subject.findMany({ orderBy: { name: 'asc' }, include: { branch: true, semester: true } }),
    prisma.pYQ.findMany({
      where: { isMostExpected: true, isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 9,
      include: { subject: true, branch: true, semester: true },
    }),
  ])
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Previous Year Questions</h1>
        <p className="text-muted-foreground">Browse PYQs by year, semester, and subject.</p>
      </div>
      <MostExpectedPYQs pyqs={mostExpected} />
      <Suspense fallback={<div className="h-16 animate-pulse rounded-xl bg-muted mb-6" />}>
        <NotesFilters branches={branches} semesters={semesters} subjects={subjects} />
      </Suspense>
      <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-48 rounded-xl"/>)}</div>}>
        <PYQList searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  )
}
