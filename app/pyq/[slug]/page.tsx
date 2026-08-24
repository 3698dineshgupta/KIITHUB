import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { signStreamToken } from '@/lib/jwt'
import { isPremiumActive } from '@/lib/utils'
import { canAccessPremiumDoc, tryConsumeUploadRewardCredit } from '@/lib/upload-reward'
import { PremiumGate } from '@/components/pdf/premium-gate'
import { CloseDocumentLoader } from '@/components/pdf/close-document-loader'
import { NoteMetaCard } from '@/components/notes/note-meta-card'
import { DocumentViewerShell } from '@/components/pdf/document-viewer-shell'
import { getSuggestions } from '@/lib/recommendations'
import { JsonLd, SITE_URL, breadcrumbJsonLd } from '@/components/seo/json-ld'
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const pyq = await prisma.pYQ.findUnique({ where: { slug }, include: { subject: true } })
  if (!pyq) return { title: 'Not Found', description: 'This PYQ could not be found.', robots: { index: false, follow: false } }
  const description = `${pyq.subject.name} PYQ ${pyq.year}`
  return {
    title: pyq.title,
    description,
    alternates: { canonical: `/pyq/${slug}` },
    openGraph: { title: pyq.title, description, url: `/pyq/${slug}`, type: 'article' },
    twitter: { card: 'summary_large_image', title: pyq.title, description },
  }
}
const devTiming = process.env.NODE_ENV !== 'production'

// Explicit alongside the notes page's identical declaration — both already
// opt into per-request dynamic rendering just by calling auth(), but this
// page's premium gate now also spends an upload-reward credit (see
// lib/upload-reward.ts), so it matters that Next.js's Link prefetching can
// never execute this body speculatively on hover.
export const dynamic = "force-dynamic";
export default async function PYQViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const t0 = devTiming ? performance.now() : 0
  const { slug } = await params
  // auth() and the PYQ lookup don't depend on each other — run concurrently.
  const [session, pyq] = await Promise.all([
    auth(),
    prisma.pYQ.findUnique({ where: { slug }, include: { subject: true, branch: true, semester: true } }),
  ])
  if (devTiming) console.log(`[pyq/${slug}] auth+pyq fetched +${(performance.now() - t0).toFixed(0)}ms`)
  if (!pyq || !pyq.isPublished) notFound()
  const user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }).catch(() => null) : null
  const userIsPremium = user ? isPremiumActive(user.membershipStatus, user.membershipExpiry) : false
  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'PYQs', url: `${SITE_URL}/pyq` },
    { name: pyq.title, url: `${SITE_URL}/pyq/${slug}` },
  ])
  const creativeWork = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: pyq.title,
    description: `${pyq.subject.name} PYQ ${pyq.year}`,
    datePublished: pyq.createdAt.toISOString(),
    dateModified: pyq.updatedAt.toISOString(),
    isAccessibleForFree: !pyq.isPremium,
    educationalLevel: 'University',
    about: pyq.subject.name,
  }
  let canView = userIsPremium
  if (pyq.isPremium && !userIsPremium && user) {
    canView = await canAccessPremiumDoc(user, 'pyq', pyq.id)
    if (canView) await tryConsumeUploadRewardCredit(user.id, 'pyq', pyq.id).catch(() => {})
  }

  if (pyq.isPremium && !canView) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <JsonLd data={breadcrumb} />
        <JsonLd data={creativeWork} />
        <CloseDocumentLoader />
        <NoteMetaCard note={{ ...pyq, contentType: 'PYQ', tags: [] }} />
        <PremiumGate />
      </div>
    )
  }
  let streamToken: string | null = null
  if (user) {
    // Token signing and view-recording don't depend on each other.
    const [signedToken] = await Promise.all([
      signStreamToken({ resourceId: pyq.id, resourceType: 'pyq', userId: user.id, isPremium: userIsPremium }),
      prisma.$transaction([
        prisma.view.create({ data: { userId: user.id, pyqId: pyq.id } }),
        prisma.pYQ.update({ where: { id: pyq.id }, data: { viewCount: { increment: 1 } } }),
      ]),
    ])
    streamToken = signedToken
    if (devTiming) console.log(`[pyq/${slug}] token+view recorded +${(performance.now() - t0).toFixed(0)}ms`)
  }

  const suggestions = streamToken
    ? await getSuggestions({
        type: 'pyq',
        id: pyq.id,
        subjectId: pyq.subjectId,
        semesterId: pyq.semesterId,
        branchId: pyq.branchId,
        examType: pyq.examType,
      })
    : []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <JsonLd data={breadcrumb} />
      <JsonLd data={creativeWork} />
      {streamToken ? (
        <DocumentViewerShell
          initial={{
            type: 'pyq',
            slug: pyq.slug,
            title: pyq.title,
            isPremium: pyq.isPremium,
            totalPages: null,
            streamUrl: `/api/stream/pyq/${pyq.id}?token=${streamToken}`,
            userEmail: user?.email ?? '',
            meta: { ...pyq, contentType: 'PYQ', tags: [] },
            suggestions,
          }}
        />
      ) : (
        <div className="space-y-6">
          <NoteMetaCard note={{ ...pyq, contentType: 'PYQ', tags: [] }} />
          <div className="rounded-xl border p-8 text-center">
            <CloseDocumentLoader />
            <p className="font-medium mb-3">Sign in to view this PYQ</p>
            <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Sign in</Link>
          </div>
        </div>
      )}
    </div>
  )
}
