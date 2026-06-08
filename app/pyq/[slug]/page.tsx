import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { signStreamToken } from '@/lib/jwt'
import { isPremiumActive } from '@/lib/utils'
import { PDFViewer } from '@/components/pdf/pdf-viewer'
import { PremiumGate } from '@/components/pdf/premium-gate'
import { NoteMetaCard } from '@/components/notes/note-meta-card'
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const pyq = await prisma.pYQ.findUnique({ where: { slug }, include: { subject: true } })
  if (!pyq) return { title: 'Not Found' }
  return { title: pyq.title, description: `${pyq.subject.name} PYQ ${pyq.year}` }
}
export default async function PYQViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()
  const pyq = await prisma.pYQ.findUnique({ where: { slug }, include: { subject: true, branch: true, semester: true } })
  if (!pyq || !pyq.isPublished) notFound()
  const user = session?.user?.email ? await prisma.user.findUnique({ where: { email: session.user.email } }) : null
  const userIsPremium = user ? isPremiumActive(user.membershipStatus, user.membershipExpiry) : false
  if (pyq.isPremium && !userIsPremium) {
    return <div className="max-w-5xl mx-auto px-4 py-8 space-y-6"><NoteMetaCard note={{ ...pyq, contentType: 'PYQ', tags: [] }} /><PremiumGate /></div>
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
      <NoteMetaCard note={{ ...pyq, contentType: 'PYQ', tags: [] }} />
      {streamToken
        ? <PDFViewer streamUrl={`/api/stream/pyq/${pyq.id}?token=${streamToken}`} title={pyq.title} isPremium={pyq.isPremium} userEmail={user?.email ?? ''} />
        : <div className="rounded-xl border p-8 text-center"><p className="font-medium mb-3">Sign in to view this PYQ</p><Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Sign in</Link></div>
      }
    </div>
  )
}
