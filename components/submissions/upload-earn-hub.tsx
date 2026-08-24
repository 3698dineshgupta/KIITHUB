'use client'
import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Crown, Sparkles, Inbox, ExternalLink, CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { SubmissionUploadForm } from './submission-upload-form'
import { UPLOAD_REWARD_THRESHOLD } from '@/lib/upload-reward-constants'
import type { BadgeProps } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, BadgeProps['variant']> = {
  PENDING: 'secondary', APPROVED: 'success', REJECTED: 'destructive',
}
const STATUS_LABEL: Record<string, string> = { PENDING: 'Pending Review', APPROVED: 'Approved', REJECTED: 'Not Approved' }
const CONTENT_TYPE_LABEL: Record<string, string> = { NOTE: 'Note', PYQ: 'PYQ', SYLLABUS: 'Syllabus', LAB_MANUAL: 'Lab Manual', ASSIGNMENT: 'Assignment' }

interface Submission {
  id: string
  title: string
  contentType: string
  status: string
  rejectionReason: string | null
  publishedType: string | null
  publishedSlug: string | null
  createdAt: string
}

interface RewardStatus {
  approvedCount: number
  uploadsNeeded: number
  active: boolean
  everGranted: boolean
  creditsRemaining: number
  expiresAt: string | null
}

function daysLeft(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
}

export function UploadEarnHub() {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null)
  const [reward, setReward] = useState<RewardStatus | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/submissions', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.submissions)
        setReward(data.reward)
      }
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-8">
      {reward && (
        <Card className={reward.active && reward.creditsRemaining > 0
          ? 'p-6 border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30'
          : 'p-6 bg-muted/30'
        }>
          {reward.active && reward.creditsRemaining > 0 ? (
            // Earned it, and there's still something to spend.
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                <Crown className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">You have {reward.creditsRemaining} premium document{reward.creditsRemaining === 1 ? '' : 's'} unlocked</h3>
                <p className="text-sm text-muted-foreground">
                  Just open any premium note or PYQ as usual — access applies automatically.
                  {reward.expiresAt && ` Expires in ${daysLeft(reward.expiresAt)} day${daysLeft(reward.expiresAt) === 1 ? '' : 's'} (${formatDate(reward.expiresAt)}).`}
                </p>
              </div>
            </div>
          ) : reward.active && reward.creditsRemaining === 0 ? (
            // Earned it, window's still open, but both credits are already
            // spent — distinct from "never earned" so this doesn't read as
            // the reward having failed to apply.
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">You've used both of your premium document unlocks</h3>
                <p className="text-sm text-muted-foreground">
                  Thanks for contributing! Both documents you opened stay unlocked
                  {reward.expiresAt && ` until they re-lock on ${formatDate(reward.expiresAt)}`}.
                </p>
              </div>
            </div>
          ) : reward.everGranted ? (
            // Earned it once, window has since closed — a one-time reward,
            // so this doesn't loop back into "upload more to earn it".
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-muted flex-shrink-0">
                <Crown className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Your premium reward window has ended</h3>
                <p className="text-sm text-muted-foreground">Thanks for contributing to KIIT Hub — your 15-day premium access period has closed.</p>
              </div>
            </div>
          ) : (
            // Never earned it yet.
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-muted flex-shrink-0">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Upload {UPLOAD_REWARD_THRESHOLD} approved documents, earn premium access</h3>
                <p className="text-sm text-muted-foreground">
                  Once you have {UPLOAD_REWARD_THRESHOLD} approved uploads, you'll unlock 2 premium documents to view free for 15 days.
                  {' '}You have <strong>{reward.approvedCount}</strong> approved so far
                  {reward.uploadsNeeded > 0 ? ` — ${reward.uploadsNeeded} more to go.` : '.'}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <SubmissionUploadForm onSubmitted={load} />

        <div>
          <h2 className="font-semibold text-lg mb-3">Your Submissions</h2>
          {submissions === null ? (
            <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
          ) : submissions.length === 0 ? (
            <Card className="p-10 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">You haven't submitted any documents yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {submissions.map(s => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                    <Badge variant="secondary" className="text-xs">{CONTENT_TYPE_LABEL[s.contentType]}</Badge>
                    <Badge variant={STATUS_BADGE[s.status]} className="text-xs">{STATUS_LABEL[s.status]}</Badge>
                  </div>
                  <p className="font-medium text-sm">{s.title}</p>
                  {s.status === 'REJECTED' && s.rejectionReason && (
                    <p className="text-xs text-muted-foreground mt-1">Reason: {s.rejectionReason}</p>
                  )}
                  {s.status === 'APPROVED' && s.publishedSlug && (
                    <Link href={`/${s.publishedType}/${s.publishedSlug}`} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" />View live document
                    </Link>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Submitted {formatDate(s.createdAt)}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
