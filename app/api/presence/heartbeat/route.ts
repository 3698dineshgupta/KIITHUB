import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Matches the client heartbeat's ping interval (components/presence/presence-heartbeat.tsx).
// Each accepted heartbeat adds exactly this many seconds to totalTimeSpentSec —
// not the actual wall-clock gap since the last beat — so a resumed/reopened
// tab after hours away can't inflate the total, and clock skew is a non-issue.
const HEARTBEAT_INTERVAL_SEC = 30

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 })

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        lastActiveAt: new Date(),
        totalTimeSpentSec: { increment: HEARTBEAT_INTERVAL_SEC },
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    // Presence tracking is best-effort — a DB hiccup here should never
    // surface to the user or spam client-side error handling.
    console.error('presence/heartbeat error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
