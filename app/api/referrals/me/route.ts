import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getReferralSummary } from '@/lib/referral'
import { SITE_URL } from '@/components/seo/json-ld'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const summary = await getReferralSummary(session.user.id, SITE_URL)
    if (!summary) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(summary)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError')) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('referrals/me GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load referral data', code: 500 }, { status: 500 })
  }
}
