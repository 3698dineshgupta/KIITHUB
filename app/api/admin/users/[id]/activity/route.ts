import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const RECENT_LIMIT = 20
// A student re-opening the same PDF several times while studying is normal
// and, view-count-wise, exactly what viewCount is for — but it means the
// raw "last 20 View rows" for an active user can be entirely repeat opens
// of one or two documents, crowding out everything else they've actually
// looked at. Pulling a much larger raw window before deduplicating down to
// distinct documents means real variety further back in the log doesn't
// get lost behind one document the reader keeps returning to.
const RAW_VIEW_POOL = 200

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'MODERATOR')) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
    }

    const [rawViews, searches] = await Promise.all([
      prisma.view.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: RAW_VIEW_POOL,
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

    // Dedupe to one row per document, keeping the most recent view's
    // timestamp (rawViews is already newest-first, so the first occurrence
    // of a given document is its most recent view) and a running count.
    const byDocument = new Map<string, { id: string; createdAt: Date; type: 'note' | 'pyq'; title: string; slug: string | null; viewCount: number }>()
    for (const v of rawViews) {
      const docKey = v.noteId ?? v.pyqId ?? v.id
      const existing = byDocument.get(docKey)
      if (existing) {
        existing.viewCount++
        continue
      }
      byDocument.set(docKey, {
        id: v.id,
        createdAt: v.createdAt,
        type: v.noteId ? 'note' : 'pyq',
        title: v.note?.title ?? v.pyq?.title ?? '(deleted document)',
        slug: v.note?.slug ?? v.pyq?.slug ?? null,
        viewCount: 1,
      })
    }
    const views = Array.from(byDocument.values()).slice(0, RECENT_LIMIT)

    return NextResponse.json({
      success: true,
      views,
      searches: searches.map(s => ({ id: s.id, query: s.query, page: s.page, createdAt: s.createdAt })),
    })
  } catch (err) {
    console.error('admin/users/[id]/activity GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load activity', code: 500 }, { status: 500 })
  }
}
