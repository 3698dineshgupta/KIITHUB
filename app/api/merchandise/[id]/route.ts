import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cloudinaryUploadImage, cloudinaryDeleteImage } from '@/lib/cloudinary'
import { sendListingForApproval } from '@/lib/telegram-merch'
import { isAllowedImageType } from '@/lib/file-validation'
import { z } from 'zod'

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '35mb',
  },
}

export const maxDuration = 60

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_IMAGES = 6

const CATEGORIES = ['ELECTRONICS', 'BOOKS_NOTES', 'COOKING_APPLIANCES', 'CYCLES', 'FURNITURE', 'CLOTHING', 'SPORTS_FITNESS', 'STATIONERY', 'OTHER'] as const
const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const

const editSchema = z.object({
  title: z.string().min(3).max(150),
  category: z.enum(CATEGORIES),
  price: z.number().positive().max(1000000),
  condition: z.enum(CONDITIONS),
  description: z.string().min(10).max(2000),
  whatsapp: z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid WhatsApp number'),
  location: z.string().max(100).optional(),
  isNegotiable: z.boolean().default(false),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const listing = await prisma.merchListing.findUnique({
      where: { id },
      include: { images: { orderBy: { order: 'asc' } }, seller: { select: { id: true, name: true, email: true } } },
    })
    if (!listing) return NextResponse.json({ success: false, error: 'Listing not found', code: 404 }, { status: 404 })

    if (listing.status !== 'APPROVED') {
      const session = await auth()
      const isOwner = session?.user?.id === listing.sellerId
      const requester = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null
      const isAdmin = requester?.role === 'ADMIN' || requester?.role === 'MODERATOR'
      if (!isOwner && !isAdmin) return NextResponse.json({ success: false, error: 'Not found', code: 404 }, { status: 404 })
    }

    return NextResponse.json({ success: true, listing })
  } catch (err) {
    console.error('merchandise [id] GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load listing', code: 500 }, { status: 500 })
  }
}

// PATCH — owner edits their listing (any status). Editing always sends the
// listing back through moderation, since content may have changed.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const listing = await prisma.merchListing.findUnique({ where: { id }, include: { images: true } })
    if (!listing) return NextResponse.json({ success: false, error: 'Listing not found', code: 404 }, { status: 404 })
    if (listing.sellerId !== session.user.id) return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ success: false, error: 'User not found', code: 404 }, { status: 404 })

    const form = await req.formData()
    const metaRaw = form.get('meta') as string | null
    if (!metaRaw) return NextResponse.json({ success: false, error: 'Missing listing details', code: 400 }, { status: 400 })
    const raw = JSON.parse(metaRaw) as Record<string, unknown>
    const meta = editSchema.parse({ ...raw, price: Number(raw.price) })

    const newImageFiles = form.getAll('images').filter((f): f is File => f instanceof File)

    if (newImageFiles.length > 0) {
      if (newImageFiles.length > MAX_IMAGES) return NextResponse.json({ success: false, error: `Maximum ${MAX_IMAGES} images allowed`, code: 400 }, { status: 400 })
      for (const f of newImageFiles) {
        if (!isAllowedImageType(f.type)) return NextResponse.json({ success: false, error: 'Only PNG, JPEG, WEBP, or GIF images are allowed', code: 400 }, { status: 400 })
        if (f.size > MAX_IMAGE_SIZE) return NextResponse.json({ success: false, error: 'Each image must be under 5 MB', code: 400 }, { status: 400 })
      }
      const uploaded = await Promise.all(newImageFiles.map(async f => {
        const buffer = Buffer.from(await f.arrayBuffer())
        return cloudinaryUploadImage(buffer, f.name)
      }))
      await Promise.all(listing.images.map(img => cloudinaryDeleteImage(img.path)))
      await prisma.merchImage.deleteMany({ where: { listingId: id } })
      await Promise.all(uploaded.map((u, i) =>
        prisma.merchImage.create({ data: { listingId: id, url: u.url, path: u.publicId, order: i } })
      ))
    }

    const updated = await prisma.merchListing.update({
      where: { id },
      data: {
        title: meta.title,
        category: meta.category,
        price: meta.price,
        isNegotiable: meta.isNegotiable,
        condition: meta.condition,
        description: meta.description,
        location: meta.location,
        whatsapp: meta.whatsapp,
        status: 'PENDING',
        rejectionReason: null,
        awaitingCustomReason: false,
        approvedById: null,
        approvedAt: null,
      },
      include: { images: { orderBy: { order: 'asc' } } },
    })

    await prisma.merchModerationLog.create({ data: { listingId: id, action: listing.status === 'REJECTED' ? 'RESUBMITTED' : 'EDITED' } })

    let telegramSent = false
    let telegramError: string | null = null
    try {
      const result = await sendListingForApproval({
        listing: updated,
        seller: { id: user.id, name: user.name, email: user.email },
        imageUrl: updated.images[0]?.url,
      })
      if (result.ok) {
        telegramSent = true
        await prisma.merchListing.update({ where: { id }, data: { telegramSent: true, telegramMessageId: result.messageId } })
      } else {
        telegramError = result.error || 'Telegram send failed'
      }
    } catch (e) {
      telegramError = e instanceof Error ? e.message : 'Telegram integration exception occurred'
    }
    if (!telegramSent) {
      await prisma.merchListing.update({ where: { id }, data: { telegramSent: false, telegramError } })
    }

    return NextResponse.json({ success: true, listing: updated })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ success: false, error: err.issues[0].message, code: 400 }, { status: 400 })
    console.error('merchandise [id] PATCH error:', err)
    return NextResponse.json({ success: false, error: 'Failed to update listing', code: 500 }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const listing = await prisma.merchListing.findUnique({ where: { id }, include: { images: true } })
    if (!listing) return NextResponse.json({ success: false, error: 'Listing not found', code: 404 }, { status: 404 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'
    if (listing.sellerId !== session.user.id && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
    }

    await Promise.all(listing.images.map(img => cloudinaryDeleteImage(img.path)))
    await prisma.merchListing.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('merchandise [id] DELETE error:', err)
    return NextResponse.json({ success: false, error: 'Failed to delete listing', code: 500 }, { status: 500 })
  }
}
