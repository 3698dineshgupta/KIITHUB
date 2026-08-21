'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Mail, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface AdminContactMessage {
  id: string
  name: string | null
  email: string
  message: string
  respondedAt: string | Date | null
  createdAt: string | Date
  user: { name: string; email: string } | null
}

export function AdminContactTable({ messages }: { messages: AdminContactMessage[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = useMemo(() => messages.filter(m => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return m.email.toLowerCase().includes(q) || (m.name ?? '').toLowerCase().includes(q) || m.message.toLowerCase().includes(q)
  }), [messages, search])

  const toggleResponded = async (id: string, current: boolean) => {
    setLoading(id)
    try {
      await fetch(`/api/admin/contact/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responded: !current }),
      })
      router.refresh()
    } catch {}
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, message..." className="max-w-xs" />

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No matching messages</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const responded = !!m.respondedAt
            return (
              <Card key={m.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={responded ? 'success' : 'warning'} className="text-xs">{responded ? 'Responded' : 'New'}</Badge>
                      <span className="text-sm font-medium">{m.name || 'Anonymous'}</span>
                      <a href={`mailto:${m.email}`} className="text-xs text-primary hover:underline flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</a>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">{m.user ? `Account: ${m.user.email} · ` : ''}{formatDate(m.createdAt)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1 flex-shrink-0"
                    disabled={loading === m.id}
                    onClick={() => toggleResponded(m.id, responded)}
                  >
                    {loading === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                    {responded ? 'Mark New' : 'Mark Responded'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
