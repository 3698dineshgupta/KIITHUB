import { HeroSection } from '@/components/home/hero'
import { FeaturedNotes } from '@/components/home/featured-notes'
import { SemesterGrid } from '@/components/home/semester-grid'
import { StatsSection } from '@/components/home/stats'
import { PremiumCTA } from '@/components/home/premium-cta'
import { SGPAPreview } from '@/components/home/sgpa-preview'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/redis'

async function getHomeData() {
  const cached = await cache.get<any>('home:data')
  if (cached) return cached
  try {
    const [latestNotes, topNotes, semesters, stats] = await Promise.all([
      prisma.note.findMany({ where: { isPublished: true }, orderBy: { createdAt: 'desc' }, take: 8, include: { subject: true, branch: true, semester: true, tags: true } }),
      prisma.note.findMany({ where: { isPublished: true }, orderBy: { viewCount: 'desc' }, take: 4, include: { subject: true, branch: true, semester: true, tags: true } }),
      prisma.semester.findMany({ orderBy: { number: 'asc' }, include: { _count: { select: { notes: true, pyqs: true } } } }),
      prisma.$transaction([prisma.user.count(), prisma.note.count(), prisma.pYQ.count(), prisma.download.count()]),
    ])
    const data = { latestNotes, topNotes, semesters, stats: { users: stats[0], notes: stats[1], pyqs: stats[2], downloads: stats[3] } }
    await cache.set('home:data', data, 1800)
    return data
  } catch (err) {
    // If DB is unreachable, return a safe fallback so the homepage doesn't crash.
    console.error('getHomeData error:', err)
    return { latestNotes: [], topNotes: [], semesters: [], stats: { users: 0, notes: 0, pyqs: 0, downloads: 0 } }
  }
}

export const dynamic = "force-dynamic";
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
