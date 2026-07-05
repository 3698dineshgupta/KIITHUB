import Link from 'next/link'
import Image from 'next/image'
import { MapPin, ImageOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime } from '@/lib/utils'
import { CATEGORY_LABELS, CATEGORY_COLORS, CONDITION_LABELS, type MerchListingSummary } from './merch-constants'

interface ListingCardProps { listing: MerchListingSummary }

export function ListingCard({ listing }: ListingCardProps) {
  const image = listing.images?.[0]
  return (
    <Link href={`/merchandise/${listing.slug}`}>
      <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group overflow-hidden">
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {image ? (
            <Image
              src={image.url}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <ImageOff className="h-8 w-8" />
            </div>
          )}
        </div>
        <CardContent className="p-4 flex flex-col">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', CATEGORY_COLORS[listing.category])}>
              {CATEGORY_LABELS[listing.category]}
            </span>
            <Badge variant="secondary" className="text-xs">{CONDITION_LABELS[listing.condition]}</Badge>
          </div>

          <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {listing.title}
          </h3>

          <div className="flex items-center justify-between mt-1">
            <span className="text-lg font-bold">₹{listing.price.toLocaleString('en-IN')}</span>
            {listing.isNegotiable && <span className="text-xs text-muted-foreground">Negotiable</span>}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t">
            <span>{listing.seller?.name}</span>
            <div className="flex items-center gap-3">
              {listing.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing.location}</span>
              )}
              <span>{formatRelativeTime(listing.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
