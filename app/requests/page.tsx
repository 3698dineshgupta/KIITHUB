import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Lock, Crown, Check } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPremiumActive } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RequestHub } from '@/components/requests/request-hub'

export const metadata: Metadata = {
  title: 'Request Hub',
  description: 'Request specific question papers, notes, or study material that isn\'t on KIIT Hub yet — a premium feature.',
  alternates: { canonical: '/requests' },
  robots: { index: false, follow: false },
}

const benefits = ['Ask for any specific paper or note', 'Track your request status', 'Get notified the moment it\'s ready', 'Direct line to the content team']

export default async function RequestsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/requests')

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) redirect('/login?callbackUrl=/requests')

  const premium = isPremiumActive(user.membershipStatus, user.membershipExpiry)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Request Hub</h1>
        <p className="text-muted-foreground">Ask us for content that isn&apos;t on the site yet — question papers, notes, anything.</p>
      </div>

      {premium ? (
        <RequestHub />
      ) : (
        <Card className="p-8 text-center border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 max-w-lg mx-auto">
          <div className="inline-flex p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Request Hub is Premium</h2>
          <p className="text-muted-foreground mb-6">Upgrade to premium to request specific question papers, notes, or any study material you can&apos;t find on KIIT Hub.</p>
          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto mb-6">
            {benefits.map(b => (
              <div key={b} className="flex items-center gap-2 text-sm text-left"><Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />{b}</div>
            ))}
          </div>
          <Link href="/premium">
            <Button variant="premium" size="lg" className="gap-2"><Crown className="h-5 w-5" />Upgrade to Premium</Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
