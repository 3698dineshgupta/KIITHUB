import { NextRequest, NextResponse } from 'next/server'
import { verifyStreamToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { isPremiumActive } from '@/lib/utils'
import { buildPdfResponse } from '@/lib/pdf-stream'

const devTiming = process.env.NODE_ENV !== 'production'

// Streaming a large PDF from Telegram/Supabase can take longer than the
// platform's default function timeout.
export const maxDuration = 60

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const t0 = devTiming ? performance.now() : 0
  try {
    const { id } = await params
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

    const payload = await verifyStreamToken(token)
    if (!payload || payload.resourceId !== id || payload.resourceType !== 'note') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }
    if (devTiming) console.log(`[stream/note] token verified +${(performance.now() - t0).toFixed(0)}ms`)

    // User and note lookups are independent — run concurrently.
    const [user, note] = await Promise.all([
      prisma.user.findUnique({ where: { id: payload.userId } }),
      prisma.note.findUnique({ where: { id } }),
    ])
    if (devTiming) console.log(`[stream/note] user+note fetched +${(performance.now() - t0).toFixed(0)}ms`)

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 403 })
    if (!note || !note.isPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const userIsPremium = isPremiumActive(user.membershipStatus, user.membershipExpiry)
    if (note.isPremium && !userIsPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const response = await buildPdfResponse({
      telegramFileId: note.telegramFileId,
      telegramMsgId: note.telegramMsgId,
      title: note.title,
      fileSize: note.fileSize,
    })
    if (devTiming) console.log(`[stream/note] response ready +${(performance.now() - t0).toFixed(0)}ms`)
    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('stream/note GET DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('Stream error:', err)
    return NextResponse.json({ success: false, error: 'Stream failed', code: 500 }, { status: 500 })
  }
}
