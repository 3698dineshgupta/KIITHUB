'use client'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Gift, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isPremiumActive } from '@/lib/utils'

// Deliberately always-dark, regardless of site theme — a promo banner is
// meant to read as a distinct "spotlight" unit that pops against either
// theme, not blend into the surrounding chrome like the rest of the footer.
export function ReferralBanner() {
  const { data: session, status } = useSession()
  const user = session?.user as any
  const premium = user ? isPremiumActive(user.membershipStatus, user.membershipExpiry) : false

  // Nothing to promote once someone already has Premium.
  if (status === 'authenticated' && premium) return null

  const loggedIn = status === 'authenticated'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 mb-10">
      {/* Decorative blurred accents */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-10 -top-16 h-40 w-40 rounded-full bg-amber-500/30 blur-3xl" />
        <div className="absolute right-24 -bottom-16 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6 px-6 py-6 sm:px-8">
        <div className="flex items-center gap-4 flex-1 text-center sm:text-left">
          <div className="hidden sm:flex flex-shrink-0 h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
            <Gift className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">
              {loggedIn ? 'Refer friends, earn Premium for free' : 'Get Premium for free — just refer friends'}
            </h3>
            <p className="text-slate-300 text-sm mt-0.5">
              {loggedIn
                ? 'Invite 10 students with your referral link and unlock Premium automatically.'
                : 'Sign up, share your referral link, and unlock Premium once 10 friends join.'}
            </p>
          </div>
        </div>
        <Link href={loggedIn ? '/profile' : '/register'} className="flex-shrink-0 w-full sm:w-auto">
          <Button variant="premium" className="gap-2 w-full sm:w-auto whitespace-nowrap">
            {loggedIn ? 'Get My Referral Link' : 'Sign Up Free'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
