import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { MapPin, Clock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { ProductGallery } from '@/components/merchandise/product-gallery'
import { WhatsAppButton } from '@/components/merchandise/whatsapp-button'
import { SaveButton } from '@/components/merchandise/save-button'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_LABELS, CONDITION_LABELS } from '@/components/merchandise/merch-constants'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const listing = await prisma.merchListing.findUnique({ where: { slug } })
  if (!listing) return { title: 'Not Found' }
  return { title: listing.title, description: listing.description.slice(0, 150) }
}

export const dynamic = 'force-dynamic'

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await auth()

  const listing = await prisma.merchListing.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { order: 'asc' } },
      seller: { select: { id: true, name: true } },
    },
  })

  if (!listing || listing.status !== 'APPROVED') notFound()

  let isSaved = false
  if (session?.user?.id) {
    const save = await prisma.merchSave.findUnique({
      where: { userId_listingId: { userId: session.user.id, listingId: listing.id } },
    })
    isSaved = !!save
    prisma.merchListing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <ProductGallery images={listing.images} title={listing.title} />

        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge variant="secondary">{CATEGORY_LABELS[listing.category]}</Badge>
              <Badge variant="secondary">{CONDITION_LABELS[listing.condition]}</Badge>
            </div>
            <h1 className="text-2xl font-bold mb-2">{listing.title}</h1>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">₹{listing.price.toLocaleString('en-IN')}</span>
              {listing.isNegotiable && <span className="text-sm text-muted-foreground">Negotiable</span>}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {listing.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{listing.location}</span>}
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Posted {formatDate(listing.createdAt)}</span>
          </div>

          <div className="rounded-xl border p-4">
            <h2 className="font-semibold text-sm mb-2">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
          </div>

          <div className="rounded-xl border p-4">
            <h2 className="font-semibold text-sm mb-1">Seller</h2>
            <p className="text-sm text-muted-foreground">{listing.seller.name}</p>
          </div>

          <div className="space-y-2">
            <WhatsAppButton whatsapp={listing.whatsapp} title={listing.title} />
            {session?.user?.id && session.user.id !== listing.sellerId && (
              <SaveButton listingId={listing.id} initialSaved={isSaved} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
