import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { CalculatorContent } from '@/components/calculator/calculator-content'

const description = 'Free SGPA and CGPA calculator using the official KIIT University grading system. Calculate your semester GPA and cumulative GPA instantly.'

export const metadata: Metadata = {
  title: 'SGPA & CGPA Calculator',
  description,
  alternates: { canonical: '/calculator' },
  openGraph: {
    title: 'KIIT SGPA & CGPA Calculator',
    description,
    url: '/calculator',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KIIT SGPA & CGPA Calculator',
    description,
  },
}

export default async function CalculatorPage() {
  const [branches, semesters, subjects] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.semester.findMany({ orderBy: { number: 'asc' } }),
    prisma.subject.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, credits: true, branchId: true, semesterId: true },
    }),
  ])
  return <CalculatorContent branches={branches} semesters={semesters} subjects={subjects} />
}
