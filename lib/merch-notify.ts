import { prisma } from '@/lib/prisma'

export async function notifyListingApproved(userId: string, title: string) {
  await prisma.notification.create({
    data: {
      userId,
      type: 'LISTING_APPROVED',
      title: 'Listing Approved!',
      message: `Your listing "${title}" has been approved and is now live on the Merchandise marketplace.`,
    },
  })
}

export async function notifyListingRejected(userId: string, title: string, reason: string) {
  await prisma.notification.create({
    data: {
      userId,
      type: 'LISTING_REJECTED',
      title: 'Listing Rejected',
      message: `Your listing "${title}" was rejected. Reason: ${reason}. You can edit and resubmit it from My Listings.`,
    },
  })
}
