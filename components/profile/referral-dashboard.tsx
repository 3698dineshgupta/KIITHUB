'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Gift, Copy, Share2, Check, Crown } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ReferralSummary {
  referralCode: string
  referralLink: string
  required: number
  valid: number
  pending: number
  invalid: number
  remaining: number
  isPremium: boolean
  membershipExpiry: string | null
  rewarded: boolean
}

export function ReferralDashboard() {
  const [data, setData] = useState<ReferralSummary | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/referrals/me', { cache: 'no-store' })
        if (res.ok) setData(await res.json())
      } catch {}
      setLoading(false)
    })()
  }, [])

  const copyLink = async () => {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const shareLink = async () => {
    if (!data) return
    const shareData = {
      title: 'Join KIIT Hub',
      text: `Join KIIT Hub using my referral link and get access to free notes, PYQs, and more!`,
      url: data.referralLink,
    }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // User cancelled or share failed — fall through to copy.
      }
    }
    copyLink()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const progressPct = data.required > 0 ? Math.min(100, Math.round((data.valid / data.required) * 100)) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" />Referral Rewards</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Invite {data.required} friends to join KIIT Hub and earn <strong>Premium access</strong> — automatically, for free.
        </p>

        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium">{data.valid} / {data.required} Referrals Completed</span>
            <span className="text-muted-foreground">{data.remaining > 0 ? `${data.remaining} to go` : 'Goal reached!'}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold">{data.valid}</div>
            <div className="text-muted-foreground text-xs">Successful</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold">{data.pending}</div>
            <div className="text-muted-foreground text-xs">Pending Review</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-2xl font-bold">{data.invalid}</div>
            <div className="text-muted-foreground text-xs">Invalid</div>
          </div>
        </div>

        <div className="rounded-lg border p-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="text-sm font-medium">Reward status: </span>
            {data.rewarded ? (
              <Badge variant="premium" className="gap-1"><Crown className="h-3 w-3" />Premium Earned</Badge>
            ) : (
              <Badge variant="secondary">Not yet earned</Badge>
            )}
          </div>
          {data.isPremium && data.membershipExpiry && (
            <span className="text-xs text-muted-foreground">Expires {formatDate(data.membershipExpiry)}</span>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Your Referral Code</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono tracking-wider">{data.referralCode}</code>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Your Referral Link</label>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-muted text-xs sm:text-sm truncate">{data.referralLink}</code>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button type="button" size="sm" className="gap-1.5" onClick={shareLink}>
                <Share2 className="h-3.5 w-3.5" />Share
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
