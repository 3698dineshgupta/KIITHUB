import { prisma } from '@/lib/prisma'
import { isPremiumActive } from '@/lib/utils'
import { UPLOAD_REWARD_THRESHOLD, UPLOAD_REWARD_CREDITS, UPLOAD_REWARD_WINDOW_DAYS } from '@/lib/upload-reward-constants'

export { UPLOAD_REWARD_THRESHOLD, UPLOAD_REWARD_CREDITS, UPLOAD_REWARD_WINDOW_DAYS }

export function uploadRewardExpiresAt(grantedAt: Date): Date {
  return new Date(grantedAt.getTime() + UPLOAD_REWARD_WINDOW_DAYS * 86400000)
}

export function isUploadRewardActive(user: { uploadRewardGrantedAt: Date | null }): boolean {
  if (!user.uploadRewardGrantedAt) return false
  return new Date() < uploadRewardExpiresAt(user.uploadRewardGrantedAt)
}

/**
 * Read-only eligibility check — used everywhere a premium gate decision is
 * made (initial page load, in-shell nav metadata, both PDF stream routes).
 * Never consumes a credit; see tryConsumeUploadRewardCredit for that. Split
 * out specifically so background prefetching (which calls the same metadata/
 * stream endpoints as a real open) can safely check "would this be allowed"
 * without accidentally spending the user's limited credits.
 */
export async function canAccessPremiumDoc(
  user: { id: string; membershipStatus: string; membershipExpiry: Date | null; uploadRewardGrantedAt: Date | null },
  docType: 'note' | 'pyq',
  docId: string
): Promise<boolean> {
  if (isPremiumActive(user.membershipStatus, user.membershipExpiry)) return true
  if (!isUploadRewardActive(user)) return false

  const unlocked = await prisma.uploadRewardUnlock.findFirst({
    where: docType === 'note' ? { userId: user.id, noteId: docId } : { userId: user.id, pyqId: docId },
  })
  if (unlocked) return true

  const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { uploadPremiumCredits: true } })
  return (fresh?.uploadPremiumCredits ?? 0) > 0
}

/**
 * Called only from the two places that unambiguously represent a genuine
 * document open — never background prefetch: the initial SSR gate in
 * app/notes|pyq/[slug]/page.tsx (guarded there by that route's
 * `dynamic = "force-dynamic"`, which already keeps Next.js Link prefetching
 * from executing this page body on mere hover), and the client's /view POST
 * fired by DocumentViewerShell.goTo for in-shell navigation (that POST is
 * deliberately separate from the side-effect-free GET detail route the
 * background prefetch effect calls). Idempotent per (user, document) via the
 * unique constraint doubling as the "already paid for" check — revisiting an
 * already-unlocked document never double-charges.
 */
export async function tryConsumeUploadRewardCredit(userId: string, docType: 'note' | 'pyq', docId: string): Promise<boolean> {
  return prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { uploadRewardGrantedAt: true, uploadPremiumCredits: true } })
    if (!user || !isUploadRewardActive(user)) return false

    const existing = await tx.uploadRewardUnlock.findFirst({
      where: docType === 'note' ? { userId, noteId: docId } : { userId, pyqId: docId },
    })
    if (existing) return true

    if (user.uploadPremiumCredits <= 0) return false

    await tx.uploadRewardUnlock.create({ data: { userId, ...(docType === 'note' ? { noteId: docId } : { pyqId: docId }) } })
    await tx.user.update({ where: { id: userId }, data: { uploadPremiumCredits: { decrement: 1 } } })
    return true
  })
}

/**
 * Called after a ContentSubmission is approved. Fires exactly once per user,
 * the first time their approved-submission count reaches the threshold —
 * never again on later uploads (one-time reward, per product decision).
 */
export async function maybeGrantUploadReward(userId: string): Promise<boolean> {
  const [user, approvedCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { uploadRewardGrantedAt: true } }),
    prisma.contentSubmission.count({ where: { userId, status: 'APPROVED' } }),
  ])
  if (!user || user.uploadRewardGrantedAt || approvedCount < UPLOAD_REWARD_THRESHOLD) return false

  await prisma.user.update({
    where: { id: userId },
    data: { uploadRewardGrantedAt: new Date(), uploadPremiumCredits: UPLOAD_REWARD_CREDITS },
  })
  return true
}
