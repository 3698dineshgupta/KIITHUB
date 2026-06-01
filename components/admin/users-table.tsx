'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Crown, Shield, UserX, Search, Loader2, Download } from 'lucide-react'
import { formatDate, daysLeft, isPremiumActive } from '@/lib/utils'

export function AdminUsersTable({ users, total, page }: { users: any[]; total: number; page: number }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

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
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {user.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{user.name}</span>
                      {user.role === 'ADMIN' && <Badge variant="default" className="text-xs gap-1"><Shield className="h-3 w-3"/>Admin</Badge>}
                      {premium && <Badge variant="premium" className="text-xs gap-1"><Crown className="h-3 w-3"/>Premium {daysLeft(user.membershipExpiry)}d left</Badge>}
                      {user.membershipStatus === 'PENDING' && <Badge variant="warning" className="text-xs">Pending</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email} · Joined {formatDate(user.createdAt)} · {user._count.downloads} downloads</p>
                  </div>
                </div>
                <div className="flex gap-2">
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
    </div>
  )
}
