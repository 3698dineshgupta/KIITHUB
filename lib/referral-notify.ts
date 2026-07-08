import { prisma } from '@/lib/prisma'

export async function notifyReferralJoined(referrerId: string) {
  await prisma.notification.create({
    data: {
      userId: referrerId,
      type: 'REFERRAL_JOINED',
      title: 'Someone joined using your referral link!',
      message: 'A new student just signed up using your referral link. Keep sharing to unlock Premium.',
    },
  })
}

export async function notifyReferralValidated(referrerId: string) {
  await prisma.notification.create({
    data: {
      userId: referrerId,
      type: 'REFERRAL_VALIDATED',
      title: 'Referral confirmed',
      message: 'Your referral has been counted towards your Premium reward progress.',
    },
  })
}

export async function notifyReferralMilestoneClose(referrerId: string, current: number, required: number) {
  await prisma.notification.create({
    data: {
      userId: referrerId,
      type: 'REFERRAL_MILESTONE_CLOSE',
      title: 'Almost there!',
      message: `You're at ${current}/${required} referrals — just ${required - current} more to unlock Premium for free!`,
    },
  })
}

export async function notifyReferralPremiumActivated(referrerId: string, days: number) {
  await prisma.notification.create({
    data: {
      userId: referrerId,
      type: 'REFERRAL_PREMIUM_ACTIVATED',
      title: 'Premium activated!',
      message: `Congratulations! You've earned ${days} days of Premium access for referring your friends.`,
    },
  })
}
