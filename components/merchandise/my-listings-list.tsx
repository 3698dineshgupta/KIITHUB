'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Loader2, Pencil, Trash2, ImageOff } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { BadgeProps } from '@/components/ui/badge'
import type { MerchListingSummary } from './merch-constants'

const STATUS_BADGE: Record<string, BadgeProps['variant']> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'destructive' }

export function MyListingsList({ listings }: { listings: MerchListingSummary[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing permanently?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/merchandise/${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
    } catch {}
    setDeleting(null)
  }

  if (!listings.length) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground mb-3">You haven&apos;t listed any items yet.</p>
        <Link href="/merchandise/sell"><Button size="sm">Sell an Item</Button></Link>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {listings.map(listing => (
        <Card key={listing.id} className="p-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {listing.images?.[0] ? (
                <Image src={listing.images[0].url} alt={listing.title} fill sizes="64px" className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground"><ImageOff className="h-5 w-5" /></div>
              )}
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Link href={`/merchandise/${listing.slug}`} className="font-medium hover:text-primary transition-colors">{listing.title}</Link>
                <Badge variant={STATUS_BADGE[listing.status]} className="text-xs">
                  {listing.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                  {listing.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">₹{listing.price.toLocaleString('en-IN')} · Posted {formatDate(listing.createdAt)}</p>
              {listing.status === 'REJECTED' && listing.rejectionReason && (
                <p className="text-sm text-destructive mt-1">Rejection reason: {listing.rejectionReason}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Link href={`/merchandise/my-listings/${listing.id}/edit`}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  {listing.status === 'REJECTED' ? 'Edit & Resubmit' : 'Edit'}
                </Button>
              </Link>
              <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/10" disabled={deleting === listing.id} onClick={() => handleDelete(listing.id)}>
                {deleting === listing.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
