import Link from 'next/link'
import { Lock, Crown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'

const benefits = ['All notes & PYQs unlocked','Lab manuals & assignments','Secure offline-style viewer','Ad-free experience']

export async function PremiumGate() {
  let price = '299'
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'premium_price' } })
    if (setting) price = setting.value
  } catch (err) {
    console.error('Failed to fetch premium_price:', err)
  }

  return (
    <Card className="p-8 text-center border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
      <div className="inline-flex p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
        <Lock className="h-8 w-8 text-amber-600" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Premium Content</h2>
      <p className="text-muted-foreground mb-6">This resource is available exclusively for premium members.</p>
      <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto mb-6">
        {benefits.map(b => (
          <div key={b} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />{b}</div>
        ))}
      </div>
      <Link href="/premium">
        <Button variant="premium" size="lg" className="gap-2"><Crown className="h-5 w-5" />Upgrade to Premium — ₹{price}/year</Button>
      </Link>
    </Card>
  )
}
