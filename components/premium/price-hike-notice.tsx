'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { TrendingUp, Crown, ArrowRight, Zap } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NoticeData {
  currentPrice: string
  newPrice: string
  effectiveAt: string
}

function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number } | null>(null)

  useEffect(() => {
    if (!target) return
    const targetMs = new Date(target).getTime()
    const tick = () => {
      const diff = Math.max(0, targetMs - Date.now())
      setRemaining({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [target])

  return remaining
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 sm:w-16 rounded-lg bg-zinc-900 dark:bg-black text-white py-2 text-center shadow-inner">
        <span className="text-xl sm:text-2xl font-bold tabular-nums">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
    </div>
  )
}

// Mounted once, globally (see app/layout.tsx). Side-effect component: fetches
// whether this signed-in, non-premium user has never been shown the
// price-hike notice yet (server-tracked, see User.priceHikeNoticeSeenAt), and
// if so, shows it and immediately marks it seen so it never shows again —
// for this account, on any device, regardless of how they dismiss it.
export function PriceHikeNotice() {
  const { status } = useSession()
  const [data, setData] = useState<NoticeData | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/premium/price-hike-notice')
        const body = await res.json()
        if (cancelled || !body.show) return
        setData({ currentPrice: body.currentPrice, newPrice: body.newPrice, effectiveAt: body.effectiveAt })
        setOpen(true)
        // Marked seen as soon as it's actually about to render — "shown
        // once" means shown, not "shown and dismissed a specific way".
        fetch('/api/premium/price-hike-notice/seen', { method: 'POST' }).catch(() => {})
      } catch { /* best-effort — never blocks the page */ }
    })()
    return () => { cancelled = true }
  }, [status])

  const remaining = useCountdown(data?.effectiveAt ?? null)

  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 gap-0 sm:rounded-2xl">
        <div className="relative bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 px-6 pt-8 pb-10 text-white text-center overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-3">
              <TrendingUp className="h-6 w-6" />
            </span>
            <h2 className="text-2xl font-bold leading-snug">Premium price is going up</h2>
            <p className="mt-1 text-sm text-white/90">Lock in today's price before it rises next week.</p>
          </div>
        </div>

        <div className="px-6 py-6 bg-background">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Now</p>
              <p className="text-3xl font-bold text-muted-foreground line-through decoration-2">₹{data.currentPrice}</p>
            </div>
            <ArrowRight className="h-6 w-6 text-orange-500 flex-shrink-0" />
            <div className="text-center">
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">From next week</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">₹{data.newPrice}</p>
            </div>
          </div>

          {remaining && (
            <div className="mb-6">
              <p className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                <Zap className="h-3 w-3 text-amber-500" />Price increases in
              </p>
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <CountdownBox value={remaining.d} label="days" />
                <span className="text-xl font-bold text-muted-foreground pb-4">:</span>
                <CountdownBox value={remaining.h} label="hrs" />
                <span className="text-xl font-bold text-muted-foreground pb-4">:</span>
                <CountdownBox value={remaining.m} label="min" />
                <span className="text-xl font-bold text-muted-foreground pb-4">:</span>
                <CountdownBox value={remaining.s} label="sec" />
              </div>
            </div>
          )}

          <Link href="/premium" onClick={() => setOpen(false)} className="block">
            <Button variant="premium" size="lg" className={cn('w-full gap-2 text-base shadow-lg shadow-amber-500/20')}>
              <Crown className="h-5 w-5" />Subscribe now at ₹{data.currentPrice}
            </Button>
          </Link>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Subscribe before the price changes to keep today's rate for this cycle.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
