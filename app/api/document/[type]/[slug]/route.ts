import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPremiumActive } from '@/lib/utils'
import { signStreamToken } from '@/lib/jwt'
import { getSuggestions } from '@/lib/recommendations'
import { canAccessPremiumDoc } from '@/lib/upload-reward'

// Side-effect-free by design (no view recording, no write of any kind) so the
// document viewer can call this liberally for background prefetch of
// upcoming/related documents without inflating analytics. Actual view
// recording happens via the sibling POST .../view route, fired only when a
// document is genuinely displayed to the user.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> }
) {
  try {
    const { type, slug } = await params
    if (type !== 'note' && type !== 'pyq') {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    const [session, doc] = await Promise.all([
      auth(),
      type === 'note'
        ? prisma.note.findUnique({ where: { slug }, include: { subject: true, branch: true, semester: true, tags: true } })
        : prisma.pYQ.findUnique({ where: { slug }, include: { subject: true, branch: true, semester: true } }),
    ])
    if (!doc || !doc.isPublished) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const user = session?.user?.id
      ? await prisma.user.findUnique({ where: { id: session.user.id } }).catch(() => null)
      : null
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const userIsPremium = isPremiumActive(user.membershipStatus, user.membershipExpiry)
    // Read-only eligibility check (never consumes a credit) — this route is
    // hit by the background prefetch effect in document-viewer-shell.tsx for
    // adjacent documents the reader may never actually open, so it must
    // never be where a credit gets spent. See lib/upload-reward.ts.
    if (doc.isPremium && !userIsPremium && !(await canAccessPremiumDoc(user, type, doc.id))) {
      return NextResponse.json(
        { error: 'Premium required', premiumGate: true, type, slug: doc.slug, title: doc.title },
        { status: 403 }
      )
    }

    const isNote = type === 'note'
    const [streamToken, suggestions] = await Promise.all([
      signStreamToken({ resourceId: doc.id, resourceType: type, userId: user.id, isPremium: userIsPremium }),
      getSuggestions({
        type,
        id: doc.id,
        subjectId: doc.subjectId,
        semesterId: doc.semesterId,
        branchId: doc.branchId,
        contentType: isNote ? (doc as typeof doc & { contentType: string }).contentType : undefined,
        examType: !isNote ? (doc as typeof doc & { examType: string }).examType : undefined,
        tags: isNote ? (doc as typeof doc & { tags: { tag: string }[] }).tags.map(t => t.tag) : undefined,
      }),
    ])

    const meta = isNote
      ? doc
      : { ...doc, contentType: 'PYQ', tags: [] as { tag: string }[] }

    return NextResponse.json({
      type,
      slug: doc.slug,
      title: doc.title,
      isPremium: doc.isPremium,
      totalPages: isNote ? (doc as typeof doc & { totalPages: number | null }).totalPages : null,
      streamUrl: `/api/stream/${type}/${doc.id}?token=${streamToken}`,
      userEmail: user.email ?? '',
      meta,
      suggestions,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('document GET DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('Document detail error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load document', code: 500 }, { status: 500 })
  }
}
