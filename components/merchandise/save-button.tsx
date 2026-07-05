'use client'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SaveButton({ listingId, initialSaved }: { listingId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    try {
      const method = saved ? 'DELETE' : 'POST'
      await fetch('/api/merchandise/save', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId }) })
      setSaved(!saved)
    } catch {}
    setLoading(false)
  }

  return (
    <Button variant="outline" size="lg" className="w-full gap-2" onClick={toggle} disabled={loading}>
      <Heart className={cn('h-5 w-5', saved && 'fill-red-500 text-red-500')} />
      {saved ? 'Saved' : 'Save for later'}
    </Button>
  )
}
