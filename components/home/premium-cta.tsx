import Link from 'next/link'
import { Crown, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'

const benefits = ['All notes & PYQs unlocked','Secure offline-style viewer','Lab manuals & assignments','Priority support','No ads']

export async function PremiumCTA() {
  let price = '299'
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'premium_price' } })
    if (setting) price = setting.value
  } catch (err) {
    console.error('Failed to fetch premium_price:', err)
  }

  return (
    <section className="py-20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-t">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 mb-4">
          <Crown className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Unlock Everything with Premium</h2>
        <p className="text-muted-foreground text-lg mb-8">Get full access to all study materials for just ₹{price}/year</p>
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {benefits.map(b => <div key={b} className="flex items-center gap-2 text-sm font-medium"><Check className="h-4 w-4 text-emerald-600" />{b}</div>)}
        </div>
        <Link href="/premium"><Button size="lg" variant="premium" className="gap-2 text-base px-8">Get Premium — ₹{price}/year<ArrowRight className="h-5 w-5" /></Button></Link>
      </div>
    </section>
  )
}
