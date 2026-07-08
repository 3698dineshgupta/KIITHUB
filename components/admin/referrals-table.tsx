'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import type { BadgeProps } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, BadgeProps['variant']> = { PENDING: 'warning', VALID: 'success', INVALID: 'destructive' }

interface AdminReferral {
  id: string
  status: 'PENDING' | 'VALID' | 'INVALID'
  ipAddress: string | null
  invalidReason: string | null
  createdAt: string | Date
  referrer: { id: string; name: string; email: string }
  referred: { id: string; name: string; email: string }
}

interface Summary {
  total: number
  valid: number
  pending: number
  invalid: number
  rewardsIssued: number
  requiredCount: number
}

export function AdminReferralsTable({ referrals, summary }: { referrals: AdminReferral[]; summary: Summary }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'VALID' | 'INVALID'>('ALL')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const filtered = filter === 'ALL' ? referrals : referrals.filter(r => r.status === filter)

  const approve = async (id: string) => {
    setLoading(id + 'approve')
    try {
      const res = await fetch(`/api/admin/referrals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (res.ok) router.refresh()
    } catch {}
    setLoading(null)
  }

  const reject = async () => {
    if (!rejectTarget) return
    setLoading(rejectTarget + 'reject')
    try {
      const res = await fetch(`/api/admin/referrals/${rejectTarget}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: reason.trim() || undefined }),
      })
      if (res.ok) {
        setRejectTarget(null)
        setReason('')
        router.refresh()
      }
    } catch {}
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Referrals', value: summary.total },
          { label: 'Successful', value: summary.valid },
          { label: 'Pending', value: summary.pending },
          { label: 'Invalid', value: summary.invalid },
          { label: 'Premium Rewards Issued', value: summary.rewardsIssued },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        {(['ALL', 'PENDING', 'VALID', 'INVALID'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors', filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}
          >
            {f} {f !== 'ALL' && <span className="ml-1 text-xs opacity-70">({referrals.filter(r => r.status === f).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No {filter.toLowerCase()} referrals</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium">{r.referrer?.name}</span>
                    <span className="text-muted-foreground text-sm">referred</span>
                    <span className="font-medium">{r.referred?.name}</span>
                    <Badge variant={STATUS_BADGE[r.status]} className="text-xs">
                      {r.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.referrer?.email} → {r.referred?.email}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    {r.ipAddress && <span>IP: {r.ipAddress}</span>}
                    <span>{formatDate(r.createdAt)}</span>
                  </div>
                  {r.status === 'INVALID' && r.invalidReason && (
                    <p className="text-sm text-destructive mt-1">Reason: {r.invalidReason}</p>
                  )}
                </div>

                {r.status !== 'VALID' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
                      disabled={!!loading}
                      onClick={() => { setRejectTarget(r.id); setReason('') }}
                    >
                      {loading === r.id + 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Reject
                    </Button>
                    <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" disabled={!!loading} onClick={() => approve(r.id)}>
                      {loading === r.id + 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={open => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Referral</DialogTitle></DialogHeader>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason (optional)..."
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          />
          <Button className="w-full" disabled={!!loading} onClick={reject}>
            {loading === rejectTarget + 'reject' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirm Rejection
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
