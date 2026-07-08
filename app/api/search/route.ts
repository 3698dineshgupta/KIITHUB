import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestIp } from '@/lib/request-ip'
import { checkRateLimit } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') ?? ''
    if (!q || q.length < 2) return NextResponse.json({ results: [] })

    // Public, unauthenticated, and hits the DB on every call — cap per-IP
    // volume so it can't be used to scrape the catalog or load-test the DB.
    const ip = getRequestIp(req) ?? 'unknown'
    const withinBudget = await checkRateLimit(`search:${ip}`, 60, 60)
    if (!withinBudget) return NextResponse.json({ results: [] }, { status: 429 })
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
