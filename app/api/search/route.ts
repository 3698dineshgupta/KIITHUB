import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') ?? ''
    if (!q || q.length < 2) return NextResponse.json({ results: [] })
    const [notes, pyqs] = await Promise.all([
      prisma.note.findMany({
        where: { isPublished: true, OR: [{ title: { contains: q, mode: 'insensitive' } }, { subject: { name: { contains: q, mode: 'insensitive' } } }] },
        take: 5, select: { id: true, title: true, slug: true, contentType: true, isPremium: true, subject: { select: { name: true } } },
      }),
      prisma.pYQ.findMany({
        where: { isPublished: true, OR: [{ title: { contains: q, mode: 'insensitive' } }, { subject: { name: { contains: q, mode: 'insensitive' } } }] },
        take: 5, select: { id: true, title: true, slug: true, year: true, isPremium: true, subject: { select: { name: true } } },
      }),
    ])
    return NextResponse.json({ results: { notes, pyqs } })
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('search GET DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('search error:', err)
    return NextResponse.json({ success: false, error: 'Search failed', code: 500 }, { status: 500 })
  }
}
