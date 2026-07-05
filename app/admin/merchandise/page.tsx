import { prisma } from '@/lib/prisma'
import { AdminMerchandiseTable } from '@/components/admin/merchandise-table'

export default async function AdminMerchandisePage() {
  const listings = await prisma.merchListing.findMany({
    include: {
      images: { orderBy: { order: 'asc' }, take: 1 },
      seller: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Merchandise</h1><p className="text-muted-foreground">Review and moderate student marketplace listings</p></div>
      <AdminMerchandiseTable listings={listings} />
    </div>
  )
}
