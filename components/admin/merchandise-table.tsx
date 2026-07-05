'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle, XCircle, Clock, Loader2, ImageOff } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { CATEGORY_LABELS, CONDITION_LABELS, type MerchListingSummary } from '@/components/merchandise/merch-constants'
import { MERCH_REJECT_REASONS } from './merch-reject-reasons'
import type { BadgeProps } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, BadgeProps['variant']> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'destructive' }

interface AdminListing extends MerchListingSummary {
  seller: { id: string; name: string; email: string }
}

export function AdminMerchandiseTable({ listings }: { listings: AdminListing[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const filtered = filter === 'ALL' ? listings : listings.filter(l => l.status === filter)

  const approve = async (id: string) => {
    setLoading(id + 'approve')
    try {
      const res = await fetch(`/api/admin/merchandise/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (res.ok) router.refresh()
    } catch {}
    setLoading(null)
  }

  const reject = async () => {
    if (!rejectTarget || !reason.trim()) return
    setLoading(rejectTarget + 'reject')
    try {
      const res = await fetch(`/api/admin/merchandise/${rejectTarget}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: reason.trim() }),
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
      <div className="flex gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors', filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}
          >
            {f} {f !== 'ALL' && <span className="ml-1 text-xs opacity-70">({listings.filter(l => l.status === f).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No {filter.toLowerCase()} listings</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(listing => (
            <Card key={listing.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {listing.images?.[0] ? (
                      <Image src={listing.images[0].url} alt={listing.title} fill sizes="56px" className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground"><ImageOff className="h-5 w-5" /></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link href={`/merchandise/${listing.slug}`} className="font-medium hover:text-primary transition-colors" target="_blank">{listing.title}</Link>
                      <Badge variant={STATUS_BADGE[listing.status]} className="text-xs">
                        {listing.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                        {listing.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{listing.seller?.name} · {listing.seller?.email}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      <span>₹{listing.price.toLocaleString('en-IN')}</span>
                      <span>{CATEGORY_LABELS[listing.category]}</span>
                      <span>{CONDITION_LABELS[listing.condition]}</span>
                      <span className="text-muted-foreground">Submitted: {formatDate(listing.createdAt)}</span>
                    </div>
                    {listing.status === 'REJECTED' && listing.rejectionReason && (
                      <p className="text-sm text-destructive mt-1">Reason: {listing.rejectionReason}</p>
                    )}
                  </div>
                </div>

                {listing.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
                      disabled={!!loading}
                      onClick={() => { setRejectTarget(listing.id); setReason('') }}
                    >
                      {loading === listing.id + 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      disabled={!!loading}
                      onClick={() => approve(listing.id)}
                    >
                      {loading === listing.id + 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
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
          <DialogHeader>
            <DialogTitle>Reject Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {MERCH_REJECT_REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={cn('w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors', reason === r ? 'border-primary bg-primary/10' : 'hover:bg-accent')}
              >
                {r}
              </button>
            ))}
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Or type a custom reason..."
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            />
          </div>
          <Button className="w-full" disabled={!reason.trim() || !!loading} onClick={reject}>
            {loading === rejectTarget + 'reject' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirm Rejection
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
