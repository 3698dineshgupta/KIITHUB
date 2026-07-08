import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { signStreamToken } from '@/lib/jwt'
import { isPremiumActive } from '@/lib/utils'
import { PDFViewer } from '@/components/pdf/pdf-viewer'
import { PremiumGate } from '@/components/pdf/premium-gate'
import { NoteMetaCard } from '@/components/notes/note-meta-card'
import { cache, CACHE_KEYS } from '@/lib/redis'
import { JsonLd, SITE_URL, breadcrumbJsonLd } from '@/components/seo/json-ld'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const note = await prisma.note.findUnique({ where: { slug }, include: { subject: true } })
  if (!note) return { title: 'Not Found', description: 'This note could not be found.', robots: { index: false, follow: false } }
  const description = note.description ?? `${note.subject.name} notes`
  return {
    title: note.title,
    description,
    alternates: { canonical: `/notes/${slug}` },
    openGraph: { title: note.title, description, url: `/notes/${slug}`, type: 'article' },
    twitter: { card: 'summary_large_image', title: note.title, description },
  }
}

const devTiming = process.env.NODE_ENV !== 'production'

export const dynamic = "force-dynamic";
export default async function NoteViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const t0 = devTiming ? performance.now() : 0
  const { slug } = await params
  // auth() and the note lookup don't depend on each other — run concurrently.
  const [session, note] = await Promise.all([
    auth(),
    prisma.note.findUnique({
      where: { slug },
      include: { subject: true, branch: true, semester: true, tags: true },
    }),
  ])
  if (devTiming) console.log(`[notes/${slug}] auth+note fetched +${(performance.now() - t0).toFixed(0)}ms`)
  if (!note || !note.isPublished) notFound()

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Notes', url: `${SITE_URL}/notes` },
    { name: note.title, url: `${SITE_URL}/notes/${slug}` },
  ])
  const creativeWork = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: note.title,
    description: note.description ?? `${note.subject.name} notes`,
    datePublished: note.createdAt.toISOString(),
    dateModified: note.updatedAt.toISOString(),
    isAccessibleForFree: !note.isPremium,
    educationalLevel: 'University',
    about: note.subject.name,
  }

  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } }).catch(() => null)
    : null
  const userIsPremium = user ? isPremiumActive(user.membershipStatus, user.membershipExpiry) : false

  // If premium note and no access → show gate
  if (note.isPremium && !userIsPremium) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <JsonLd data={breadcrumb} />
        <JsonLd data={creativeWork} />
        <NoteMetaCard note={note} />
        <PremiumGate />
      </div>
    )
  }

  // Generate signed stream token
  let streamToken: string | null = null
  if (user) {
    // Token signing and view-recording don't depend on each other.
    const [signedToken] = await Promise.all([
      signStreamToken({
        resourceId: note.id,
        resourceType: 'note',
        userId: user.id,
        isPremium: userIsPremium,
      }),
      prisma.$transaction([
        prisma.view.create({ data: { userId: user.id, noteId: note.id } }),
        prisma.note.update({ where: { id: note.id }, data: { viewCount: { increment: 1 } } }),
      ]),
    ])
    streamToken = signedToken
    await cache.del(CACHE_KEYS.noteDetail(note.id))
    if (devTiming) console.log(`[notes/${slug}] token+view recorded +${(performance.now() - t0).toFixed(0)}ms`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <JsonLd data={breadcrumb} />
      <JsonLd data={creativeWork} />
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
          <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Sign in</Link>
        </div>
      )}
    </div>
  )
}
