import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MyListingsList } from '@/components/merchandise/my-listings-list'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'My Listings',
  robots: { index: false, follow: false },
}

export default async function MyListingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/merchandise/my-listings')

  const listings = await prisma.merchListing.findMany({
    where: { sellerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { images: { orderBy: { order: 'asc' }, take: 1 } },
  })

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">My Listings</h1>
        <p className="text-muted-foreground text-sm">Track the status of items you&apos;ve listed for sale.</p>
      </div>
      <MyListingsList listings={listings} />
    </div>
  )
}
