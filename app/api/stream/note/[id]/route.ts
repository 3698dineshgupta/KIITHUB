import { NextRequest, NextResponse } from 'next/server'
import { verifyStreamToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { telegramStream } from '@/lib/telegram'
import { cache, CACHE_KEYS } from '@/lib/redis'
import { isPremiumActive } from '@/lib/utils'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

    // Verify signed JWT
    const payload = await verifyStreamToken(token)
    if (!payload || payload.resourceId !== params.id || payload.resourceType !== 'note') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    // Verify user still exists and has permission
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 403 })

    const note = await prisma.note.findUnique({ where: { id: params.id } })
    if (!note || !note.isPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const userIsPremium = isPremiumActive(user.membershipStatus, user.membershipExpiry)

    if (note.isPremium && !userIsPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    // Check Redis cache for Telegram file URL
    const cacheKey = CACHE_KEYS.telegramUrl(note.telegramFileId)
    let pdfBuffer: Buffer

    const cachedUrl = await cache.get<string>(cacheKey)
    if (cachedUrl) {
      const res = await fetch(cachedUrl)
      if (res.ok) {
        pdfBuffer = Buffer.from(await res.arrayBuffer())
      } else {
        // URL expired — fetch fresh
        pdfBuffer = await telegramStream(note.telegramFileId)
      }
    } else {
      pdfBuffer = await telegramStream(note.telegramFileId)
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-store, no-cache',
        'Content-Disposition': `inline; filename="${encodeURIComponent(note.title)}.pdf"`,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    })
  } catch (err) {
    console.error('Stream error:', err)
    return NextResponse.json({ error: 'Stream failed' }, { status: 500 })
  }
}
