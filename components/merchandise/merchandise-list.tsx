import Link from 'next/link'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ListingCard } from './listing-card'
import { Button } from '@/components/ui/button'

const LIMIT = 12

export async function MerchandiseList({ searchParams }: { searchParams: Record<string, string> }) {
  const page = parseInt(searchParams.page ?? '1')
  const category = searchParams.category
  const condition = searchParams.condition
  const minPrice = searchParams.minPrice
  const maxPrice = searchParams.maxPrice
  const search = searchParams.search
  const sort = searchParams.sort ?? 'newest'

  const where: Prisma.MerchListingWhereInput = { status: 'APPROVED' }
  if (category) where.category = category as Prisma.EnumMerchCategoryFilter['equals']
  if (condition) where.condition = condition as Prisma.EnumProductConditionFilter['equals']
  if (minPrice || maxPrice) {
    where.price = {}
    if (minPrice) where.price.gte = parseFloat(minPrice)
    if (maxPrice) where.price.lte = parseFloat(maxPrice)
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  const orderBy: Prisma.MerchListingOrderByWithRelationInput =
    sort === 'oldest' ? { createdAt: 'asc' } :
    sort === 'price_asc' ? { price: 'asc' } :
    sort === 'price_desc' ? { price: 'desc' } :
    { createdAt: 'desc' }

  let listings: Prisma.MerchListingGetPayload<{ include: { images: true; seller: { select: { name: true } } } }>[] = []
  let total = 0
  try {
    [listings, total] = await Promise.all([
      prisma.merchListing.findMany({
        where,
        orderBy,
        skip: (page - 1) * LIMIT,
        take: LIMIT,
        include: { images: { orderBy: { order: 'asc' }, take: 1 }, seller: { select: { name: true } } },
      }),
      prisma.merchListing.count({ where }),
    ])
  } catch (err) {
    console.error('Failed to fetch merchandise listings:', err)
    return (
      <div className="text-center py-16 text-destructive">
        <p className="text-lg font-medium mb-2">Error loading listings</p>
        <p className="text-sm">Please try refreshing the page.</p>
      </div>
    )
  }

  const totalPages = Math.ceil(total / LIMIT)

  if (!listings.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium mb-2">No items found</p>
        <p className="text-sm">Try adjusting your filters, or be the first to sell something!</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{total} item{total !== 1 ? 's' : ''}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {listings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          {page > 1 && (
            <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}>
              <Button variant="outline" size="sm">Previous</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground px-3">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}>
              <Button variant="outline" size="sm">Next</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
