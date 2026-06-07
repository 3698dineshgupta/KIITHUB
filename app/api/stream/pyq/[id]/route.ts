import { NextRequest, NextResponse } from 'next/server'
import { verifyStreamToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { telegramStream, telegramGetFileUrl } from '@/lib/telegram'
import { cache, CACHE_KEYS } from '@/lib/redis'
import { isPremiumActive } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

    const payload = await verifyStreamToken(token)
    if (!payload || payload.resourceId !== id || payload.resourceType !== 'pyq') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 403 })

    const pyq = await prisma.pYQ.findUnique({ where: { id } })
    if (!pyq || !pyq.isPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const userIsPremium = isPremiumActive(user.membershipStatus, user.membershipExpiry)
    if (pyq.isPremium && !userIsPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    // Check Redis cache for Telegram file URL
    const cacheKey = CACHE_KEYS.telegramUrl(pyq.telegramFileId)
    let pdfBuffer: Buffer

    const cachedUrl = await cache.get<string>(cacheKey)
    if (cachedUrl) {
      try {
        const res = await fetch(cachedUrl)
        if (res.ok) {
          pdfBuffer = Buffer.from(await res.arrayBuffer())
        } else {
          const freshUrl = await telegramGetFileUrl(pyq.telegramFileId)
          await cache.set(cacheKey, freshUrl, 3300)
          pdfBuffer = await telegramStream(pyq.telegramFileId)
        }
      } catch (e) {
        console.warn('Cached Telegram URL fetch error, falling back to direct stream:', e)
        pdfBuffer = await telegramStream(pyq.telegramFileId)
      }
    } else {
      const freshUrl = await telegramGetFileUrl(pyq.telegramFileId)
      await cache.set(cacheKey, freshUrl, 3300)
      pdfBuffer = await telegramStream(pyq.telegramFileId)
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-store, no-cache',
        'Content-Disposition': `inline; filename="${encodeURIComponent(pyq.title)}.pdf"`,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    })
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('stream/pyq GET DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('PYQ stream error:', err)
    return NextResponse.json({ success: false, error: 'Stream failed', code: 500 }, { status: 500 })
  }
}
