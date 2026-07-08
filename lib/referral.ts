import { prisma } from '@/lib/prisma'
import { cache, CACHE_KEYS } from '@/lib/redis'
import {
  notifyReferralJoined,
  notifyReferralValidated,
  notifyReferralMilestoneClose,
  notifyReferralPremiumActivated,
} from '@/lib/referral-notify'

// Excludes visually-ambiguous characters (0/O, 1/I/L) since codes are meant
// to be read and typed, not just pasted from a link.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const DEFAULT_REQUIRED_REFERRALS = 10
const DEFAULT_REWARD_DAYS = 365
// Same-IP referrals under the same referrer beyond this count get flagged
// INVALID rather than blocked outright — this app has no email/OTP
// verification pipeline to lean on for fraud detection, so IP reuse is the
// only automatic signal available. Admins can still manually approve a
// flagged referral from /admin/referrals if it's a false positive (e.g. a
// shared hostel/campus network).
const MAX_REFERRALS_PER_IP_PER_REFERRER = 1

export function generateReferralCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode()
    const exists = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } })
    if (!exists) return code
  }
  // Vanishingly unlikely fallback — wider keyspace guarantees uniqueness.
  return generateReferralCode(16)
}

async function getSettingsMap(): Promise<Record<string, string>> {
  const settingsKey = CACHE_KEYS.settings()
  let settingsMap = await cache.get<Record<string, string>>(settingsKey)
  if (!settingsMap) {
    const rows = await prisma.setting.findMany()
    settingsMap = Object.fromEntries(rows.map(s => [s.key, s.value]))
    await cache.set(settingsKey, settingsMap, 3600)
  }
  return settingsMap
}

export async function getRequiredReferralCount(): Promise<number> {
  const settings = await getSettingsMap()
  const n = parseInt(settings.referral_required_count ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REQUIRED_REFERRALS
}

async function getRewardDays(): Promise<number> {
  const settings = await getSettingsMap()
  const n = parseInt(settings.premium_days ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REWARD_DAYS
}

/**
 * Credits a referral for a brand-new account. Called right after a user row
 * is created — from the credentials registration route directly, and from
 * NextAuth's `events.createUser` for Google OAuth sign-ups. Never throws:
 * a referral-crediting failure must not break account creation.
 */
export async function creditReferral(opts: { newUserId: string; referralCode: string; ipAddress?: string | null }): Promise<void> {
  const { newUserId, referralCode, ipAddress } = opts
  try {
    // Case-insensitive: freshly generated codes are always uppercase, but
    // pre-existing users (backfilled before this feature existed) got their
    // own lowercase cuid as a fallback referralCode — an exact-match lookup
    // against an uppercased input would silently miss those.
    const referrer = await prisma.user.findFirst({ where: { referralCode: { equals: referralCode, mode: 'insensitive' } } })
    if (!referrer) return
    if (referrer.id === newUserId) return // self-referral guard (defense in depth)

    // Referral.referredId is @unique — this also protects against a
    // double-credit race at the DB level regardless of this check.
    const already = await prisma.referral.findUnique({ where: { referredId: newUserId } })
    if (already) return

    let suspicious = false
    if (ipAddress) {
      const priorFromSameIp = await prisma.referral.count({
        where: { referrerId: referrer.id, ipAddress, status: { not: 'INVALID' } },
      })
      if (priorFromSameIp >= MAX_REFERRALS_PER_IP_PER_REFERRER) suspicious = true
    }

    const [referral] = await prisma.$transaction([
      prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: newUserId,
          ipAddress: ipAddress ?? null,
          status: suspicious ? 'INVALID' : 'VALID',
          invalidReason: suspicious ? 'Duplicate IP address for this referrer' : null,
          validatedAt: suspicious ? null : new Date(),
        },
      }),
      prisma.user.update({ where: { id: newUserId }, data: { referredById: referrer.id } }),
    ])

    await prisma.auditLog.create({
      data: {
        userId: referrer.id,
        action: suspicious ? 'REFERRAL_FLAGGED' : 'REFERRAL_VALIDATED',
        resource: 'referral',
        resourceId: referral.id,
        ipAddress: ipAddress ?? null,
        metadata: { referredId: newUserId },
      },
    })

    await notifyReferralJoined(referrer.id)
    if (!suspicious) {
      await notifyReferralValidated(referrer.id)
      await checkAndGrantMilestone(referrer.id)
    }
  } catch (err) {
    console.error('creditReferral error:', err)
  }
}

/**
 * One-time milestone: the first time a referrer's valid referral count
 * reaches the required threshold, they're granted Premium. Guarded by
 * `referralRewardedAt` so this can be called freely (e.g. after every new
 * valid referral, or from an admin manual-approve) without double-granting.
 */
export async function checkAndGrantMilestone(referrerId: string): Promise<void> {
  const referrer = await prisma.user.findUnique({ where: { id: referrerId } })
  if (!referrer || referrer.isBanned || referrer.referralRewardedAt) return

  const required = await getRequiredReferralCount()
  const validCount = await prisma.referral.count({ where: { referrerId, status: 'VALID' } })

  if (validCount < required) {
    if (required - validCount === 1) {
      await notifyReferralMilestoneClose(referrerId, validCount, required)
    }
    return
  }

  const rewardDays = await getRewardDays()
  const now = new Date()
  const base = referrer.membershipExpiry && referrer.membershipExpiry > now ? referrer.membershipExpiry : now
  const newExpiry = new Date(base.getTime() + rewardDays * 24 * 60 * 60 * 1000)

  const updated = await prisma.user.updateMany({
    where: { id: referrerId, referralRewardedAt: null },
    data: { membershipStatus: 'PREMIUM', membershipExpiry: newExpiry, referralRewardedAt: now },
  })
  // updateMany's where-guard means a concurrent duplicate call is a no-op here.
  if (updated.count === 0) return

  await prisma.referralReward.create({
    data: { userId: referrerId, milestone: required, grantedDays: rewardDays },
  })
  await prisma.auditLog.create({
    data: { userId: referrerId, action: 'REFERRAL_REWARD_GRANTED', resource: 'referral_reward', metadata: { milestone: required, rewardDays } },
  })

  await notifyReferralPremiumActivated(referrerId, rewardDays)
  if (referrer.email) {
    // Dynamically imported: lib/mail.ts pulls in nodemailer, which uses
    // Node core modules (`stream`) that aren't available in the Edge
    // Runtime. lib/auth.ts (used by middleware.ts, which runs on the edge)
    // imports this file for referral crediting — a static top-level import
    // here would drag nodemailer into the edge bundle and break every route.
    const { sendPremiumApprovedEmail } = await import('@/lib/mail')
    await sendPremiumApprovedEmail(referrer.email, referrer.name, rewardDays).catch(() => {})
  }
}

export interface ReferralSummary {
  referralCode: string
  referralLink: string
  required: number
  valid: number
  pending: number
  invalid: number
  remaining: number
  isPremium: boolean
  membershipExpiry: Date | null
  rewarded: boolean
}

export async function getReferralSummary(userId: string, siteUrl: string): Promise<ReferralSummary | null> {
  // One round trip instead of two: the user lookup doesn't depend on the
  // counts (or vice versa), and grouping by status folds three separate
  // COUNT queries into one.
  const [user, statusCounts, required] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, membershipStatus: true, membershipExpiry: true, referralRewardedAt: true },
    }),
    prisma.referral.groupBy({ by: ['status'], where: { referrerId: userId }, _count: true }),
    getRequiredReferralCount(),
  ])
  if (!user) return null

  const countFor = (status: 'VALID' | 'PENDING' | 'INVALID') => statusCounts.find(s => s.status === status)?._count ?? 0
  const valid = countFor('VALID')
  const pending = countFor('PENDING')
  const invalid = countFor('INVALID')

  return {
    referralCode: user.referralCode,
    referralLink: `${siteUrl}/register?ref=${user.referralCode}`,
    required,
    valid,
    pending,
    invalid,
    remaining: Math.max(0, required - valid),
    isPremium: user.membershipStatus === 'PREMIUM',
    membershipExpiry: user.membershipExpiry,
    rewarded: !!user.referralRewardedAt,
  }
}
