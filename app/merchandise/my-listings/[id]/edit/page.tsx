import { redirect, notFound } from 'next/navigation'
import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SellForm } from '@/components/merchandise/sell-form'

export const metadata: Metadata = { title: 'Edit Listing' }
export const dynamic = 'force-dynamic'

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/login?callbackUrl=/merchandise/my-listings/${id}/edit`)

  const listing = await prisma.merchListing.findUnique({
    where: { id },
    include: { images: { orderBy: { order: 'asc' } } },
  })

  if (!listing || listing.sellerId !== session.user.id) notFound()
  if (listing.status !== 'REJECTED') redirect('/merchandise/my-listings')

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Edit & Resubmit Listing</h1>
        {listing.rejectionReason && (
          <p className="text-sm text-destructive">Previously rejected: {listing.rejectionReason}</p>
        )}
      </div>
      <SellForm
        mode="edit"
        listingId={listing.id}
        initialData={{
          title: listing.title,
          category: listing.category,
          price: listing.price,
          condition: listing.condition,
          description: listing.description,
          whatsapp: listing.whatsapp,
          location: listing.location,
          isNegotiable: listing.isNegotiable,
          images: listing.images,
        }}
      />
    </div>
  )
}
