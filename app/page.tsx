import { HeroSection } from '@/components/home/hero'
import { FeaturedNotes } from '@/components/home/featured-notes'
import { SemesterGrid } from '@/components/home/semester-grid'
import { StatsSection } from '@/components/home/stats'
import { PremiumCTA } from '@/components/home/premium-cta'
import { SGPAPreview } from '@/components/home/sgpa-preview'
import { prisma } from '@/lib/prisma'

async function getHomeData() {
  try {
    const [latestNotes, topNotes, semesters, stats] = await Promise.all([
      prisma.note.findMany({ where: { isPublished: true }, orderBy: { createdAt: 'desc' }, take: 8, include: { subject: true, branch: true, semester: true, tags: true } }),
      prisma.note.findMany({ where: { isPublished: true }, orderBy: { viewCount: 'desc' }, take: 4, include: { subject: true, branch: true, semester: true, tags: true } }),
      prisma.semester.findMany({ orderBy: { number: 'asc' }, include: { _count: { select: { notes: true, pyqs: true } } } }),
      prisma.$transaction([prisma.user.count(), prisma.note.count(), prisma.pYQ.count(), prisma.view.count()]),
    ])
    return { latestNotes, topNotes, semesters, stats: { users: stats[0], notes: stats[1], pyqs: stats[2], views: stats[3] } }
  } catch (err) {
    // If DB is unreachable, return a safe fallback so the homepage doesn't crash.
    console.error('getHomeData error:', err)
    return { latestNotes: [], topNotes: [], semesters: [], stats: { users: 0, notes: 0, pyqs: 0, views: 0 } }
  }
}

// This page has no session/auth dependence — Navbar's user-specific bits are
// a separate client component hydrated in the root layout. force-dynamic was
// making every single visit pay a full serverless invocation + DB round trip;
// ISR lets Vercel serve the rendered HTML straight from the edge CDN instead.
// The manual Redis cache this used to layer on top is gone too — it silently
// defeated ISR entirely (Next.js always treats a fetch()-based call, which is
// what @upstash/redis issues under the hood, as dynamic and opts the whole
// route out of static rendering, no matter what `revalidate` says), and is
// redundant now that ISR caches the full HTML output anyway. Content changes
// invalidate this immediately via revalidatePath('/') — see
// app/api/upload/route.ts and app/api/admin/notes/[id]/route.ts — so this
// number is really just the safety-net ceiling, not the typical staleness.
export const revalidate = 1800;
export default async function HomePage() {
  const data = await getHomeData()
  return (
    <div className="min-h-screen">
      <HeroSection />
      <StatsSection stats={data.stats} />
      <FeaturedNotes title="Latest Notes" notes={data.latestNotes} />
      <SemesterGrid semesters={data.semesters} />
      <FeaturedNotes title="Trending This Week" notes={data.topNotes} variant="trending" />
      <SGPAPreview />
      <PremiumCTA />
    </div>
  )
}
