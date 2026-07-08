import { prisma } from '@/lib/prisma'
import { getRequiredReferralCount } from '@/lib/referral'
import { AdminReferralsTable } from '@/components/admin/referrals-table'

export default async function AdminReferralsPage() {
  const [referrals, statusCounts, rewardsIssued, requiredCount] = await Promise.all([
    prisma.referral.findMany({
      include: {
        referrer: { select: { id: true, name: true, email: true } },
        referred: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    prisma.referral.groupBy({ by: ['status'], _count: true }),
    prisma.referralReward.count(),
    getRequiredReferralCount(),
  ])

  const countFor = (status: 'VALID' | 'PENDING' | 'INVALID') => statusCounts.find(s => s.status === status)?._count ?? 0
  const valid = countFor('VALID')
  const pending = countFor('PENDING')
  const invalid = countFor('INVALID')
  const summary = { total: valid + pending + invalid, valid, pending, invalid, rewardsIssued, requiredCount }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referral Rewards</h1>
        <p className="text-muted-foreground">Monitor referral activity and moderate flagged referrals. Required referral count is configurable from Settings.</p>
      </div>
      <AdminReferralsTable referrals={referrals} summary={summary} />
    </div>
  )
}
