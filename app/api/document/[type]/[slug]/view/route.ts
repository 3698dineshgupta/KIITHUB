import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tryConsumeUploadRewardCredit } from '@/lib/upload-reward'

// Fired fire-and-forget by the client exactly once whenever a document
// actually becomes the one on screen (fresh switch or cache-served
// prev/next/suggestion click) — separate from the side-effect-free GET
// detail route so background prefetching never inflates view counts. Since
// this is the one unambiguous "genuinely viewing this now" signal for
// in-shell navigation (the initial page load is the other, handled directly
// in app/notes|pyq/[slug]/page.tsx), it's also where an upload-reward credit
// actually gets spent for a premium document reached via Prev/Next/
// suggestions — never in the metadata GET or the stream routes, both of
// which are also hit by background prefetching. isPremium isn't rechecked
// here: by the time the client has a non-gated DocumentDetail to call this
// with, /api/document/[type]/[slug] already decided access was allowed.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> }
) {
  try {
    const { type, slug } = await params
    if (type !== 'note' && type !== 'pyq') {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    if (type === 'note') {
      const note = await prisma.note.findUnique({ where: { slug }, select: { id: true, isPremium: true } })
      if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      await prisma.$transaction([
        prisma.view.create({ data: { userId: session.user.id, noteId: note.id } }),
        prisma.note.update({ where: { id: note.id }, data: { viewCount: { increment: 1 } } }),
      ])
      if (note.isPremium) await tryConsumeUploadRewardCredit(session.user.id, 'note', note.id).catch(() => {})
    } else {
      const pyq = await prisma.pYQ.findUnique({ where: { slug }, select: { id: true, isPremium: true } })
      if (!pyq) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      await prisma.$transaction([
        prisma.view.create({ data: { userId: session.user.id, pyqId: pyq.id } }),
        prisma.pYQ.update({ where: { id: pyq.id }, data: { viewCount: { increment: 1 } } }),
      ])
      if (pyq.isPremium) await tryConsumeUploadRewardCredit(session.user.id, 'pyq', pyq.id).catch(() => {})
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    // Best-effort — a failed view record shouldn't surface as an error to the reader.
    console.error('Document view record error:', err)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
