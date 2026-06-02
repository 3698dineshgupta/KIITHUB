import { notFound, redirect } from 'next/navigation'
import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { signStreamToken } from '@/lib/jwt'
import { isPremiumActive } from '@/lib/utils'
import { PDFViewer } from '@/components/pdf/pdf-viewer'
import { PremiumGate } from '@/components/pdf/premium-gate'
import { NoteMetaCard } from '@/components/notes/note-meta-card'
import { cache, CACHE_KEYS } from '@/lib/redis'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const note = await prisma.note.findUnique({ where: { slug }, include: { subject: true } })
  if (!note) return { title: 'Not Found' }
  return { title: note.title, description: note.description ?? `${note.subject.name} notes` }
}

export const dynamic = "force-dynamic";
export default async function NoteViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()
  const note = await prisma.note.findUnique({
    where: { slug },
    include: { subject: true, branch: true, semester: true, tags: true },
  })
  if (!note || !note.isPublished) notFound()

  const user = session?.user ? await prisma.user.findUnique({ where: { email: session.user.email! } }) : null
  const userIsPremium = user ? isPremiumActive(user.membershipStatus, user.membershipExpiry) : false

  // If premium note and no access → show gate
  if (note.isPremium && !userIsPremium) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <NoteMetaCard note={note} />
        <PremiumGate />
      </div>
    )
  }

  // Generate signed stream token
  let streamToken: string | null = null
  if (user) {
    streamToken = await signStreamToken({
      resourceId: note.id,
      resourceType: 'note',
      userId: user.id,
      isPremium: userIsPremium,
    })
    // Record view
    await prisma.$transaction([
      prisma.view.create({ data: { userId: user.id, noteId: note.id } }),
      prisma.note.update({ where: { id: note.id }, data: { viewCount: { increment: 1 } } }),
    ])
    await cache.del(CACHE_KEYS.noteDetail(note.id))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <NoteMetaCard note={note} />
      {streamToken ? (
        <PDFViewer
          streamUrl={`/api/stream/note/${note.id}?token=${streamToken}`}
          title={note.title}
          isPremium={note.isPremium}
          totalPages={note.totalPages}
          userEmail={user?.email ?? ''}
        />
      ) : (
        <div className="rounded-xl border p-8 text-center">
          <p className="font-medium mb-3">Sign in to view this PDF</p>
          <a href="/login" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Sign in</a>
        </div>
      )}
    </div>
  )
}
