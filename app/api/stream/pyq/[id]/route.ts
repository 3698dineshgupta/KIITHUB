import { NextRequest, NextResponse } from 'next/server'
import { verifyStreamToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { telegramStream } from '@/lib/telegram'
import { isPremiumActive } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

    const payload = await verifyStreamToken(token)
    if (!payload || payload.resourceId !== params.id || payload.resourceType !== 'pyq') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 403 })

    const pyq = await prisma.pYQ.findUnique({ where: { id: params.id } })
    if (!pyq || !pyq.isPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const userIsPremium = isPremiumActive(user.membershipStatus, user.membershipExpiry)
    if (pyq.isPremium && !userIsPremium) {
      return NextResponse.json({ error: 'Premium required' }, { status: 403 })
    }

    const pdfBuffer = await telegramStream(pyq.telegramFileId)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-store, no-cache',
        'Content-Disposition': `inline; filename="${encodeURIComponent(pyq.title)}.pdf"`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('PYQ stream error:', err)
    return NextResponse.json({ error: 'Stream failed' }, { status: 500 })
  }
}
