import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'MODERATOR')) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
    }

    const sp = req.nextUrl.searchParams
    const category = sp.get('category')
    const severity = sp.get('severity')
    const status = sp.get('status')
    const search = sp.get('search')?.trim()

    const where: Prisma.BugReportWhereInput = {}
    if (category && category !== 'ALL') where.category = category as never
    if (severity && severity !== 'ALL') where.severity = severity as never
    if (status && status !== 'ALL') where.status = status as never
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { bugId: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [reports, statusCounts] = await Promise.all([
      prisma.bugReport.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
      prisma.bugReport.groupBy({ by: ['status'], _count: true }),
    ])

    const summary = Object.fromEntries(statusCounts.map(s => [s.status, s._count]))

    return NextResponse.json({ success: true, reports, summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('admin/bugs GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load reports', code: 500 }, { status: 500 })
  }
}
