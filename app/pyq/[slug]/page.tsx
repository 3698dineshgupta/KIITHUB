import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { signStreamToken } from '@/lib/jwt'
import { isPremiumActive } from '@/lib/utils'
import { PDFViewer } from '@/components/pdf/pdf-viewer'
import { PremiumGate } from '@/components/pdf/premium-gate'
import { NoteMetaCard } from '@/components/notes/note-meta-card'
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
export default async function PYQViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()
  const pyq = await prisma.pYQ.findUnique({ where: { slug }, include: { subject: true, branch: true, semester: true } })
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
  if (pyq.isPremium && !userIsPremium) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <JsonLd data={breadcrumb} />
        <JsonLd data={creativeWork} />
        <NoteMetaCard note={{ ...pyq, contentType: 'PYQ', tags: [] }} />
        <PremiumGate />
      </div>
    )
  }
  let streamToken: string | null = null
  if (user) {
    streamToken = await signStreamToken({ resourceId: pyq.id, resourceType: 'pyq', userId: user.id, isPremium: userIsPremium })
    await prisma.$transaction([
      prisma.view.create({ data: { userId: user.id, pyqId: pyq.id } }),
      prisma.pYQ.update({ where: { id: pyq.id }, data: { viewCount: { increment: 1 } } }),
    ])
  }
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <JsonLd data={breadcrumb} />
      <JsonLd data={creativeWork} />
      <NoteMetaCard note={{ ...pyq, contentType: 'PYQ', tags: [] }} />
      {streamToken
        ? <PDFViewer streamUrl={`/api/stream/pyq/${pyq.id}?token=${streamToken}`} title={pyq.title} isPremium={pyq.isPremium} userEmail={user?.email ?? ''} />
        : <div className="rounded-xl border p-8 text-center"><p className="font-medium mb-3">Sign in to view this PYQ</p><Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Sign in</Link></div>
      }
    </div>
  )
}
