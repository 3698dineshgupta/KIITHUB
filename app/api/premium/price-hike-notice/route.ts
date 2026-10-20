import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cache, CACHE_KEYS } from '@/lib/redis'
import { isPremiumActive } from '@/lib/utils'

// Whether to show the one-time price-hike popup to the signed-in user, plus
// the figures it needs. "Show once ever" is tracked server-side via
// User.priceHikeNoticeSeenAt (not localStorage) so it holds across devices
// and survives cleared site data — see the schema comment on that column.
// Anonymous visitors always get show:false: there's no account to remember
// "already seen" against, and the feature is explicitly about signed-up
// users (existing and future).
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ show: false })

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ show: false })

    const alreadyPremium = isPremiumActive(user.membershipStatus, user.membershipExpiry)
    if (alreadyPremium || user.priceHikeNoticeSeenAt) return NextResponse.json({ show: false })

    const settingsKey = CACHE_KEYS.settings()
    let settingsMap = await cache.get<Record<string, string>>(settingsKey)
    if (!settingsMap) {
      const dbSettings = await prisma.setting.findMany()
      settingsMap = Object.fromEntries(dbSettings.map(s => [s.key, s.value]))
      await cache.set(settingsKey, settingsMap, 3600)
    }

    const currentPrice = settingsMap.premium_price || '29'
    const newPrice = settingsMap.price_hike_new_price || '49'
    const effectiveAt = settingsMap.price_hike_effective_at || null
    // Nothing to announce if no deadline is configured, or it's already past.
    if (!effectiveAt || new Date(effectiveAt).getTime() <= Date.now()) {
      return NextResponse.json({ show: false })
    }

    return NextResponse.json({ show: true, currentPrice, newPrice, effectiveAt })
  } catch (err) {
    console.error('price-hike-notice GET error:', err)
    return NextResponse.json({ show: false })
  }
}
