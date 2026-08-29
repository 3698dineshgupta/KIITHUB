'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Crown, Shield, UserX, Search, Loader2, Download, Timer, Activity, Eye, ExternalLink } from 'lucide-react'
import { formatDate, formatRelativeTime, formatDuration, daysLeft, isPremiumActive, isOnline } from '@/lib/utils'

const PAGE_LABEL: Record<string, string> = { notes: 'Notes', pyq: 'PYQs', merchandise: 'Merchandise' }

export function AdminUsersTable({ users, total, page }: { users: any[]; total: number; page: number }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [activityUser, setActivityUser] = useState<{ id: string; name: string } | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/admin/users?search=${encodeURIComponent(search)}`)
  }

  const doAction = async (userId: string, action: string) => {
    setLoading(userId + action)
    try {
      await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action }) })
      router.refresh()
    } catch {}
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button type="submit" size="sm">Search</Button>
      </form>

      <div className="space-y-2">
        {users.map(user => {
          const premium = isPremiumActive(user.membershipStatus, user.membershipExpiry)
          return (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {user.name[0]}
                    </div>
                    {isOnline(user.lastActiveAt) && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 ring-2 ring-background" />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{user.name}</span>
                      {user.role === 'ADMIN' && <Badge variant="default" className="text-xs gap-1"><Shield className="h-3 w-3"/>Admin</Badge>}
                      {premium && <Badge variant="premium" className="text-xs gap-1"><Crown className="h-3 w-3"/>Premium {daysLeft(user.membershipExpiry)}d left</Badge>}
                      {user.membershipStatus === 'PENDING' && <Badge variant="warning" className="text-xs">Pending</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {user.email} · Joined {formatDate(user.createdAt)} · {user._count.downloads} downloads
                      {' · '}
                      {isOnline(user.lastActiveAt) ? <span className="text-green-600 font-medium">Online now</span> : user.lastActiveAt ? `Active ${formatRelativeTime(user.lastActiveAt)}` : 'Never active'}
                      {user.totalTimeSpentSec > 0 && <span className="inline-flex items-center gap-0.5 ml-1"><Timer className="h-3 w-3 inline" /> {formatDuration(user.totalTimeSpentSec)}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => setActivityUser({ id: user.id, name: user.name })}>
                    <Activity className="h-3 w-3" />Activity
                  </Button>
                  {premium
                    ? <Button size="sm" variant="outline" disabled={!!loading} onClick={() => doAction(user.id, 'revoke_premium')} className="text-xs h-8">{loading === user.id+'revoke_premium' ? <Loader2 className="h-3 w-3 animate-spin"/> : 'Revoke Premium'}</Button>
                    : <Button size="sm" variant="premium" disabled={!!loading} onClick={() => doAction(user.id, 'grant_premium')} className="text-xs h-8 gap-1">{loading === user.id+'grant_premium' ? <Loader2 className="h-3 w-3 animate-spin"/> : <><Crown className="h-3 w-3"/>Grant Premium</>}</Button>
                  }
                  {user.role !== 'ADMIN'
                    ? <Button size="sm" variant="secondary" disabled={!!loading} onClick={() => doAction(user.id, 'make_admin')} className="text-xs h-8">Make Admin</Button>
                    : <Button size="sm" variant="outline" disabled={!!loading} onClick={() => doAction(user.id, 'make_student')} className="text-xs h-8">Remove Admin</Button>
                  }
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {users.length} of {total} users</span>
        <div className="flex gap-2">
          {page > 1 && <Button variant="outline" size="sm" onClick={() => router.push(`/admin/users?page=${page-1}`)}>Previous</Button>}
          {users.length === 20 && <Button variant="outline" size="sm" onClick={() => router.push(`/admin/users?page=${page+1}`)}>Next</Button>}
        </div>
      </div>

      <UserActivityDialog user={activityUser} onClose={() => setActivityUser(null)} />
    </div>
  )
}

interface ActivityView { id: string; type: 'note' | 'pyq'; title: string; slug: string | null; createdAt: string; viewCount: number }
interface ActivitySearch { id: string; query: string; page: string; createdAt: string }

function UserActivityDialog({ user, onClose }: { user: { id: string; name: string } | null; onClose: () => void }) {
  const [views, setViews] = useState<ActivityView[] | null>(null)
  const [searches, setSearches] = useState<ActivitySearch[] | null>(null)

  useEffect(() => {
    if (!user) { setViews(null); setSearches(null); return }
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/users/${user.id}/activity`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setViews(data.views)
          setSearches(data.searches)
        }
      } catch {}
    })()
  }, [user])

  return (
    <Dialog open={!!user} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user?.name}'s Activity</DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-1.5"><Eye className="h-4 w-4 text-muted-foreground" />Recently Viewed</h3>
            {views === null ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}</div>
            ) : views.length === 0 ? (
              <p className="text-xs text-muted-foreground">No documents viewed yet.</p>
            ) : (
              <div className="space-y-2">
                {views.map(v => (
                  <div key={v.id} className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{v.title}</p>
                      <p className="text-muted-foreground">{v.type === 'note' ? 'Note' : 'PYQ'} · {formatRelativeTime(v.createdAt)}{v.viewCount > 1 && ` · viewed ${v.viewCount}×`}</p>
                    </div>
                    {v.slug && (
                      <Link href={`/${v.type}/${v.slug}`} target="_blank" className="text-primary flex-shrink-0 mt-0.5"><ExternalLink className="h-3 w-3" /></Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-3 flex items-center gap-1.5"><Search className="h-4 w-4 text-muted-foreground" />Recently Searched</h3>
            {searches === null ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}</div>
            ) : searches.length === 0 ? (
              <p className="text-xs text-muted-foreground">No searches logged yet.</p>
            ) : (
              <div className="space-y-2">
                {searches.map(s => (
                  <div key={s.id} className="text-xs">
                    <p className="font-medium">"{s.query}"</p>
                    <p className="text-muted-foreground">{PAGE_LABEL[s.page] ?? s.page} · {formatRelativeTime(s.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
