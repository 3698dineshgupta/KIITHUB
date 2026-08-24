import { prisma } from '@/lib/prisma'
import { UPLOAD_REWARD_CREDITS, UPLOAD_REWARD_WINDOW_DAYS } from '@/lib/upload-reward'

export async function notifySubmissionApproved(userId: string, title: string) {
  await prisma.notification.create({
    data: {
      userId,
      type: 'SUBMISSION_APPROVED',
      title: 'Your upload was approved',
      message: `"${title}" is now live on KIIT Hub. Thanks for contributing!`,
    },
  })
}

export async function notifySubmissionRejected(userId: string, title: string, reason: string) {
  await prisma.notification.create({
    data: {
      userId,
      type: 'SUBMISSION_REJECTED',
      title: 'Your upload was not approved',
      message: `"${title}" wasn't approved. Reason: ${reason}`,
    },
  })
}

export async function notifyUploadRewardGranted(userId: string) {
  await prisma.notification.create({
    data: {
      userId,
      type: 'UPLOAD_REWARD_GRANTED',
      title: 'You earned premium access!',
      message: `Thanks for your contributions — you've unlocked ${UPLOAD_REWARD_CREDITS} premium documents, viewable for the next ${UPLOAD_REWARD_WINDOW_DAYS} days.`,
    },
  })
}
