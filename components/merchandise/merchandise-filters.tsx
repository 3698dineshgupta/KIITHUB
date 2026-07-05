'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Search, X, SlidersHorizontal, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORY_OPTIONS, CONDITION_OPTIONS } from './merch-constants'

export function MerchandiseFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(sp.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, sp]
  )

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname)
    })
  }
  const hasFilters = sp.size > 0

  return (
    <div className="space-y-4 mb-6 relative">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for items..."
          defaultValue={sp.get('search') ?? ''}
          onChange={e => updateParam('search', e.target.value || null)}
          className="pl-9 pr-10"
          disabled={isPending}
        />
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />

        <Select value={sp.get('category') ?? ''} onValueChange={v => updateParam('category', v === 'all' ? null : v)} disabled={isPending}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sp.get('condition') ?? ''} onValueChange={v => updateParam('condition', v === 'all' ? null : v)} disabled={isPending}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            {CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Min ₹"
          defaultValue={sp.get('minPrice') ?? ''}
          onChange={e => updateParam('minPrice', e.target.value || null)}
          className="w-24"
          disabled={isPending}
        />
        <Input
          type="number"
          placeholder="Max ₹"
          defaultValue={sp.get('maxPrice') ?? ''}
          onChange={e => updateParam('maxPrice', e.target.value || null)}
          className="w-24"
          disabled={isPending}
        />

        <Select value={sp.get('sort') ?? 'newest'} onValueChange={v => updateParam('sort', v)} disabled={isPending}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground" disabled={isPending}>
            <X className="h-4 w-4" />Clear
          </Button>
        )}
      </div>
    </div>
  )
}
