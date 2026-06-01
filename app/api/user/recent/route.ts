import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) return NextResponse.json({ recent: [] })

    const history = await prisma.viewHistory.findMany({
      where: { userId: user.id },
      include: { pdf: true },
      orderBy: { viewedAt: 'desc' },
      take: 10,
      distinct: ['pdfId'],
    })

    return NextResponse.json({ recent: history.map((h) => h.pdf) })
  } catch (error) {
    console.error('Recent views error:', error)
    return NextResponse.json({ error: 'Failed to get recent views' }, { status: 500 })
  }
}
