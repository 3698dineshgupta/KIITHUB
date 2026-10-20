import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Marks the price-hike popup as shown for the signed-in user — permanent,
// never reset. Called once the popup actually renders client-side (see
// components/premium/price-hike-notice.tsx), not on any particular
// dismissal action, so "shown once" holds regardless of how the user closes
// it.
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false }, { status: 401 })

    await prisma.user.updateMany({
      where: { email: session.user.email, priceHikeNoticeSeenAt: null },
      data: { priceHikeNoticeSeenAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('price-hike-notice/seen POST error:', err)
    return NextResponse.json({ success: false }, { status: 503 })
  }
}
