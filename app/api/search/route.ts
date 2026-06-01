import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
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
}
