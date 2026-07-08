import { NextRequest, NextResponse } from 'next/server'
import { verifyStreamToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { isPremiumActive } from '@/lib/utils'
import { buildPdfResponse } from '@/lib/pdf-stream'

const devTiming = process.env.NODE_ENV !== 'production'

// Streaming a large PDF from Telegram/Supabase can take longer than the
// platform's default function timeout.
export const maxDuration = 60

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t0 = devTiming ? performance.now() : 0
  try {
    const { id } = await params
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

    const payload = await verifyStreamToken(token)
    if (!payload || payload.resourceId !== id || payload.resourceType !== 'pyq') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }
    if (devTiming) console.log(`[stream/pyq] token verified +${(performance.now() - t0).toFixed(0)}ms`)

    // User and PYQ lookups are independent — run concurrently.
    const [user, pyq] = await Promise.all([
      prisma.user.findUnique({ where: { id: payload.userId } }),
      prisma.pYQ.findUnique({ where: { id } }),
    ])
    if (devTiming) console.log(`[stream/pyq] user+pyq fetched +${(performance.now() - t0).toFixed(0)}ms`)

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 403 })
    if (!pyq || !pyq.isPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const userIsPremium = isPremiumActive(user.membershipStatus, user.membershipExpiry)
    if (pyq.isPremium && !userIsPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const response = await buildPdfResponse({
      telegramFileId: pyq.telegramFileId,
      telegramMsgId: pyq.telegramMsgId,
      title: pyq.title,
      fileSize: pyq.fileSize,
    })
    if (devTiming) console.log(`[stream/pyq] response ready +${(performance.now() - t0).toFixed(0)}ms`)
    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('stream/pyq GET DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('PYQ stream error:', err)
    return NextResponse.json({ success: false, error: 'Stream failed', code: 500 }, { status: 500 })
  }
}
