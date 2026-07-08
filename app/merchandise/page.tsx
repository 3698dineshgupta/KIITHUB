import { Suspense } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { MerchandiseFilters } from '@/components/merchandise/merchandise-filters'
import { MerchandiseList } from '@/components/merchandise/merchandise-list'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Merchandise Marketplace',
  description: 'Buy and sell items with fellow KIIT students.',
  alternates: { canonical: '/merchandise' },
  openGraph: {
    title: 'Merchandise Marketplace | KIIT Hub',
    description: 'Buy and sell items with fellow KIIT students.',
    url: '/merchandise',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merchandise Marketplace | KIIT Hub',
    description: 'Buy and sell items with fellow KIIT students.',
  },
}

export default async function MerchandisePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const resolvedSearchParams = await searchParams
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">Merchandise Marketplace</h1>
          <p className="text-muted-foreground">Buy and sell items with fellow KIIT students.</p>
        </div>
        <Link href="/merchandise/sell">
          <Button className="gap-2"><Plus className="h-4 w-4" />Sell an Item</Button>
        </Link>
      </div>
      <Suspense fallback={<div className="h-16 animate-pulse rounded-xl bg-muted mb-6" />}>
        <MerchandiseFilters />
      </Suspense>
      <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>}>
        <MerchandiseList searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  )
}
