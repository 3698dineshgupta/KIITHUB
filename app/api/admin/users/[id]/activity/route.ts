import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const RECENT_LIMIT = 20

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'MODERATOR')) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
    }

    const [views, searches] = await Promise.all([
      prisma.view.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        include: {
          note: { select: { title: true, slug: true } },
          pyq: { select: { title: true, slug: true } },
        },
      }),
      prisma.searchLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
      }),
    ])

    return NextResponse.json({
      success: true,
      views: views.map(v => ({
        id: v.id,
        createdAt: v.createdAt,
        type: v.noteId ? 'note' : 'pyq',
        title: v.note?.title ?? v.pyq?.title ?? '(deleted document)',
        slug: v.note?.slug ?? v.pyq?.slug ?? null,
      })),
      searches: searches.map(s => ({ id: s.id, query: s.query, page: s.page, createdAt: s.createdAt })),
    })
  } catch (err) {
    console.error('admin/users/[id]/activity GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load activity', code: 500 }, { status: 500 })
  }
}
