import { prisma } from '@/lib/prisma'
import { editListingMessage, formatListingCaption } from '@/lib/telegram-merch'
import { notifyListingApproved, notifyListingRejected } from '@/lib/merch-notify'
import { sendListingApprovedEmail } from '@/lib/mail'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function approveListing(listingId: string, adminId: string | null) {
  const listing = await prisma.merchListing.findUnique({ where: { id: listingId }, include: { seller: true } })
  if (!listing) return { ok: false as const, error: 'Listing not found' }
  if (listing.status !== 'PENDING') return { ok: false as const, error: 'Listing already reviewed' }

  const [updated] = await prisma.$transaction([
    prisma.merchListing.update({
      where: { id: listingId },
      data: { status: 'APPROVED', approvedById: adminId, approvedAt: new Date(), rejectionReason: null, awaitingCustomReason: false },
    }),
    prisma.merchModerationLog.create({
      data: { listingId, action: 'APPROVED', adminId: adminId ?? undefined },
    }),
  ])
  await notifyListingApproved(listing.sellerId, listing.title)
  await sendListingApprovedEmail(listing.seller.email, listing.seller.name, listing.title, `${SITE_URL}/merchandise/${listing.slug}`)

  if (listing.telegramMessageId) {
    const caption = formatListingCaption({ ...listing, seller: listing.seller }, '✅ APPROVED')
    await editListingMessage(listing.telegramMessageId, caption, undefined, true)
  }
  return { ok: true as const, listing: updated }
}

export async function rejectListing(listingId: string, adminId: string | null, reason: string) {
  const listing = await prisma.merchListing.findUnique({ where: { id: listingId }, include: { seller: true } })
  if (!listing) return { ok: false as const, error: 'Listing not found' }
  if (listing.status !== 'PENDING') return { ok: false as const, error: 'Listing already reviewed' }

  const [updated] = await prisma.$transaction([
    prisma.merchListing.update({
      where: { id: listingId },
      data: { status: 'REJECTED', approvedById: adminId, approvedAt: new Date(), rejectionReason: reason, awaitingCustomReason: false },
    }),
    prisma.merchModerationLog.create({
      data: { listingId, action: 'REJECTED', reason, adminId: adminId ?? undefined },
    }),
  ])
  await notifyListingRejected(listing.sellerId, listing.title, reason)

  if (listing.telegramMessageId) {
    const caption = formatListingCaption({ ...listing, seller: listing.seller }, `❌ REJECTED\nReason: ${reason}`)
    await editListingMessage(listing.telegramMessageId, caption, undefined, true)
  }
  return { ok: true as const, listing: updated }
}

export async function markAwaitingCustomReason(listingId: string) {
  await prisma.merchListing.update({ where: { id: listingId }, data: { awaitingCustomReason: true } })
}
