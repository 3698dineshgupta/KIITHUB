'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Eye, Clock, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const STATUS_BADGE: Record<string, any> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'destructive',
}

export function AdminPaymentsTable({ payments, bankQrCode }: { payments: any[]; bankQrCode: string | null }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')

  const filtered = filter === 'ALL' ? payments : payments.filter(p => p.status === filter)

  const handleAction = async (paymentId: string, action: 'approve' | 'reject') => {
    setLoading(paymentId + action)
    try {
      const res = await fetch('/api/payment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      })
      if (res.ok) router.refresh()
    } catch {}
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
          >
            {f} {f !== 'ALL' && <span className="ml-1 text-xs opacity-70">({payments.filter(p => p.status === f).length})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No {filter.toLowerCase()} payments</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(payment => (
            <Card key={payment.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    {payment.user.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{payment.user.name}</span>
                      <Badge variant={STATUS_BADGE[payment.status] ?? 'secondary'} className="text-xs">
                        {payment.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                        {payment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{payment.user.email}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      <span><span className="text-muted-foreground">Txn ID:</span> {payment.transactionId}</span>
                      <span><span className="text-muted-foreground">Submitted:</span> {formatDate(payment.createdAt)}</span>
                      {payment.approvedAt && <span><span className="text-muted-foreground">Reviewed:</span> {formatDate(payment.approvedAt)}</span>}
                    </div>
                    {payment.notes && <p className="text-sm text-muted-foreground mt-1">Note: {payment.notes}</p>}
                    {payment.status === 'PENDING' && bankQrCode && (
                      <div className="mt-3 p-3 bg-muted/30 border rounded-lg max-w-xs">
                        <span className="text-xs font-semibold text-muted-foreground block mb-1">Active Payment QR Code:</span>
                        <img src={bankQrCode} alt="Bank QR Code" className="max-w-[150px] h-auto rounded border bg-white" />
                      </div>
                    )}
                  </div>
                </div>

                {payment.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
                      disabled={!!loading}
                      onClick={() => handleAction(payment.id, 'reject')}
                    >
                      {loading === payment.id + 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      disabled={!!loading}
                      onClick={() => handleAction(payment.id, 'approve')}
                    >
                      {loading === payment.id + 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
