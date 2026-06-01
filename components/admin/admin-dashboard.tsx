import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/redis'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, BookOpen, FileText, Download, Crown, Clock, TrendingUp, Eye } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

async function getAnalytics() {
  const d7 = new Date(Date.now() - 7 * 86400000)
  const [totalUsers, premiumUsers, totalNotes, totalPYQs, totalDownloads, pendingPayments, recentUsers, recentViews, topNotes, recentPayments] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { membershipStatus: 'PREMIUM' } }),
    prisma.note.count({ where: { isPublished: true } }),
    prisma.pYQ.count({ where: { isPublished: true } }),
    prisma.download.count(),
    prisma.paymentRequest.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.view.count({ where: { createdAt: { gte: d7 } } }),
    prisma.note.findMany({ where: { isPublished: true }, orderBy: { viewCount: 'desc' }, take: 5, include: { subject: true } }),
    prisma.paymentRequest.findMany({ where: { status: 'PENDING' }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ])
  return { totalUsers, premiumUsers, totalNotes, totalPYQs, totalDownloads, pendingPayments, recentUsers, recentViews, topNotes, recentPayments }
}

export async function AdminDashboard() {
  const a = await getAnalytics()

  const statCards = [
    { label: 'Total Users', value: a.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', sub: `+${a.recentUsers} this week` },
    { label: 'Premium Users', value: a.premiumUsers, icon: Crown, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', sub: `${a.totalUsers > 0 ? ((a.premiumUsers / a.totalUsers) * 100).toFixed(1) : 0}% conversion` },
    { label: 'Notes', value: a.totalNotes, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', sub: 'Published' },
    { label: 'PYQs', value: a.totalPYQs, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', sub: 'Published' },
    { label: 'Downloads', value: a.totalDownloads, icon: Download, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', sub: 'All time' },
    { label: 'Views (7d)', value: a.recentViews, icon: Eye, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30', sub: 'Last 7 days' },
    { label: 'Pending Payments', value: a.pendingPayments, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', sub: 'Awaiting review', alert: a.pendingPayments > 0 },
    { label: 'New Users (7d)', value: a.recentUsers, icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30', sub: 'Last 7 days' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Card key={card.label} className={card.alert ? 'border-orange-300 dark:border-orange-700' : ''}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <span className="text-sm text-muted-foreground">{card.label}</span>
              </div>
              <div className="text-2xl font-bold tabular-nums">{card.value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Top Notes by Views
              <Link href="/admin/notes"><Button variant="ghost" size="sm">View all</Button></Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {a.topNotes.map((note, i) => (
                <div key={note.id} className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-muted-foreground/30 w-8">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{note.title}</p>
                    <p className="text-xs text-muted-foreground">{note.subject.name}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><Eye className="h-3 w-3" />{note.viewCount}</div>
                    {note.isPremium && <Badge variant="premium" className="text-[10px]">PRO</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Pending Payments
              {a.pendingPayments > 0 && <Badge variant="destructive">{a.pendingPayments} pending</Badge>}
              <Link href="/admin/payments"><Button variant="ghost" size="sm">Review all</Button></Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {a.recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pending payments</p>
            ) : (
              <div className="space-y-3">
                {a.recentPayments.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {p.user.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.user.name}</p>
                      <p className="text-xs text-muted-foreground">{p.transactionId.slice(0, 20)}...</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
