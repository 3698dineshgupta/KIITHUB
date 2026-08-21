import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/redis'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, BookOpen, FileText, Download, Crown, Clock, TrendingUp, Eye, Radio, Timer } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatDate, formatRelativeTime, formatDuration } from '@/lib/utils'

// Matches app/api/presence/heartbeat/route.ts's 30s beat interval: 3 missed
// beats of slack for network jitter/backgrounding before reading "offline".
const ONLINE_WINDOW_MS = 90_000

async function getAnalytics() {
  const d7 = new Date(Date.now() - 7 * 86400000)
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS)
  const [
    totalUsers, premiumUsers, totalNotes, totalPYQs, totalDownloads, pendingPayments,
    recentUsers, recentViews, topNotes, topPyqs, recentPayments,
    onlineCount, onlineUsers, mostActiveUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { membershipStatus: 'PREMIUM' } }),
    prisma.note.count({ where: { isPublished: true } }),
    prisma.pYQ.count({ where: { isPublished: true } }),
    prisma.download.count(),
    prisma.paymentRequest.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.view.count({ where: { createdAt: { gte: d7 } } }),
    prisma.note.findMany({ where: { isPublished: true }, orderBy: { viewCount: 'desc' }, take: 5, include: { subject: true } }),
    prisma.pYQ.findMany({ where: { isPublished: true }, orderBy: { viewCount: 'desc' }, take: 5, include: { subject: true } }),
    prisma.paymentRequest.findMany({ where: { status: 'PENDING' }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.user.count({ where: { lastActiveAt: { gte: onlineSince } } }),
    prisma.user.findMany({ where: { lastActiveAt: { gte: onlineSince } }, orderBy: { lastActiveAt: 'desc' }, take: 8, select: { id: true, name: true, email: true, role: true, lastActiveAt: true } }),
    prisma.user.findMany({ where: { totalTimeSpentSec: { gt: 0 } }, orderBy: { totalTimeSpentSec: 'desc' }, take: 5, select: { id: true, name: true, email: true, totalTimeSpentSec: true } }),
  ])

  // Notes and PYQs are separate tables (separate viewCount columns), so
  // "most visited document" needs both merged and re-ranked together rather
  // than just showing notes.
  const topDocuments = [
    ...topNotes.map(n => ({ id: n.id, title: n.title, subject: n.subject.name, viewCount: n.viewCount, isPremium: n.isPremium, type: 'note' as const })),
    ...topPyqs.map(p => ({ id: p.id, title: p.title, subject: p.subject.name, viewCount: p.viewCount, isPremium: p.isPremium, type: 'pyq' as const })),
  ].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5)

  return { totalUsers, premiumUsers, totalNotes, totalPYQs, totalDownloads, pendingPayments, recentUsers, recentViews, topDocuments, recentPayments, onlineCount, onlineUsers, mostActiveUsers }
}

export async function AdminDashboard() {
  const a = await getAnalytics()

  const statCards = [
    { label: 'Online Now', value: a.onlineCount, icon: Radio, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', sub: 'Active in last 90s' },
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
        {/* Most Visited Documents (notes + PYQs merged) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Most Visited Documents
              <Link href="/admin/notes"><Button variant="ghost" size="sm">View all</Button></Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {a.topDocuments.map((doc, i) => (
                <div key={`${doc.type}-${doc.id}`} className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-muted-foreground/30 w-8">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.subject} · {doc.type === 'note' ? 'Note' : 'PYQ'}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><Eye className="h-3 w-3" />{doc.viewCount}</div>
                    {doc.isPremium && <Badge variant="premium" className="text-[10px]">PRO</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Online Now */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Online Now
              <Link href="/admin/users"><Button variant="ghost" size="sm">All users</Button></Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {a.onlineUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No one online right now</p>
            ) : (
              <div className="space-y-3">
                {a.onlineUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {user.name}
                        {user.role === 'ADMIN' && <Badge variant="default" className="text-[10px]">Admin</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatRelativeTime(user.lastActiveAt!)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Most Active Users by time spent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Most Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            {a.mostActiveUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No activity recorded yet</p>
            ) : (
              <div className="space-y-3">
                {a.mostActiveUsers.map((user, i) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-muted-foreground/30 w-8">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                      <Timer className="h-3 w-3" />{formatDuration(user.totalTimeSpentSec)}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
