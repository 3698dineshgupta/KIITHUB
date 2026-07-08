import { Metadata } from 'next'
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

export default function CalculatorPage() {
  return <CalculatorContent />
}
