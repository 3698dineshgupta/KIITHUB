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

// This page is statically generated at build time with no revalidate, so a
// DB hiccup here doesn't just degrade one request — it fails the entire
// Vercel build and blocks every route from deploying (confirmed: a
// transient Supabase pooler outage during build took down a deploy that
// had nothing to do with this page). Same defensive fallback as the
// homepage's getHomeData: degrade to empty lists rather than fail the build.
async function getCalculatorData() {
  try {
    const [branches, semesters, subjects] = await Promise.all([
      prisma.branch.findMany({ orderBy: { name: 'asc' } }),
      prisma.semester.findMany({ orderBy: { number: 'asc' } }),
      prisma.subject.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, credits: true, branchId: true, semesterId: true },
      }),
    ])
    return { branches, semesters, subjects }
  } catch (err) {
    console.error('getCalculatorData error:', err)
    return { branches: [], semesters: [], subjects: [] }
  }
}

export const revalidate = 1800

export default async function CalculatorPage() {
  const { branches, semesters, subjects } = await getCalculatorData()
  return <CalculatorContent branches={branches} semesters={semesters} subjects={subjects} />
}
