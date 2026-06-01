import Link from 'next/link'
import { Calculator, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function SGPAPreview() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Card className="p-10 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
          <div className="inline-flex p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 mb-4">
            <Calculator className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold mb-3">SGPA &amp; CGPA Calculator</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Calculate your semester GPA and cumulative GPA instantly. Export as PDF.</p>
          <Link href="/calculator"><Button size="lg" className="gap-2">Try Calculator<ArrowRight className="h-5 w-5" /></Button></Link>
        </Card>
      </div>
    </section>
  )
}
