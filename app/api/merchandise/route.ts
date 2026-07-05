import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supabaseUploadImage } from '@/lib/supabase'
import { sendListingForApproval } from '@/lib/telegram-merch'
import { slugify } from '@/lib/utils'
import { z } from 'zod'

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '35mb',
  },
}

export const maxDuration = 60

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB per image
const MAX_IMAGES = 6
const MERCH_BUCKET = process.env.SUPABASE_BUCKET_MERCH || 'merch-images'

const CATEGORIES = ['ELECTRONICS', 'BOOKS_NOTES', 'COOKING_APPLIANCES', 'CYCLES', 'FURNITURE', 'CLOTHING', 'SPORTS_FITNESS', 'STATIONERY', 'OTHER'] as const
const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const

const listingSchema = z.object({
  title: z.string().min(3).max(150),
  category: z.enum(CATEGORIES),
  price: z.number().positive().max(1000000),
  condition: z.enum(CONDITIONS),
  description: z.string().min(10).max(2000),
  whatsapp: z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid WhatsApp number'),
  location: z.string().max(100).optional(),
  isNegotiable: z.boolean().default(false),
})

// GET /api/merchandise — public marketplace listing (approved only)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const LIMIT = 12
    const category = searchParams.get('category')
    const condition = searchParams.get('condition')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') ?? 'newest'

    const where: Prisma.MerchListingWhereInput = { status: 'APPROVED' }
    if (category && (CATEGORIES as readonly string[]).includes(category)) where.category = category as Prisma.MerchListingWhereInput['category']
    if (condition && (CONDITIONS as readonly string[]).includes(condition)) where.condition = condition as Prisma.MerchListingWhereInput['condition']
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orderBy: Prisma.MerchListingOrderByWithRelationInput =
      sort === 'oldest' ? { createdAt: 'asc' } :
      sort === 'price_asc' ? { price: 'asc' } :
      sort === 'price_desc' ? { price: 'desc' } :
      { createdAt: 'desc' }

    const [listings, total] = await Promise.all([
      prisma.merchListing.findMany({
        where,
        orderBy,
        skip: (page - 1) * LIMIT,
        take: LIMIT,
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          seller: { select: { name: true } },
        },
      }),
      prisma.merchListing.count({ where }),
    ])

    return NextResponse.json({ success: true, listings, total, totalPages: Math.ceil(total / LIMIT), page })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('merchandise GET DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('merchandise GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load listings', code: 500 }, { status: 500 })
  }
}

// POST /api/merchandise — logged-in student submits a new listing
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ success: false, error: 'User not found', code: 404 }, { status: 404 })

    const form = await req.formData()
    const metaRaw = form.get('meta') as string | null
    if (!metaRaw) return NextResponse.json({ success: false, error: 'Missing listing details', code: 400 }, { status: 400 })

    const raw = JSON.parse(metaRaw) as Record<string, unknown>
    const meta = listingSchema.parse({ ...raw, price: Number(raw.price) })

    const imageFiles = form.getAll('images').filter((f): f is File => f instanceof File)
    if (imageFiles.length === 0) return NextResponse.json({ success: false, error: 'At least one product image is required', code: 400 }, { status: 400 })
    if (imageFiles.length > MAX_IMAGES) return NextResponse.json({ success: false, error: `Maximum ${MAX_IMAGES} images allowed`, code: 400 }, { status: 400 })
    for (const f of imageFiles) {
      if (!f.type.startsWith('image/')) return NextResponse.json({ success: false, error: 'Only image files are allowed', code: 400 }, { status: 400 })
      if (f.size > MAX_IMAGE_SIZE) return NextResponse.json({ success: false, error: 'Each image must be under 5 MB', code: 400 }, { status: 400 })
    }

    // Prevent duplicate pending submissions of the same item
    const existing = await prisma.merchListing.findFirst({
      where: { sellerId: user.id, status: 'PENDING', title: { equals: meta.title, mode: 'insensitive' } },
    })
    if (existing) {
      return NextResponse.json({ success: false, error: 'You already have a pending listing with this title', code: 409 }, { status: 409 })
    }

    const baseSlug = slugify(meta.title)
    let slug = baseSlug
    let attempt = 0
    while (await prisma.merchListing.findUnique({ where: { slug } })) {
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const uploaded = await Promise.all(imageFiles.map(async f => {
      const buffer = Buffer.from(await f.arrayBuffer())
      return supabaseUploadImage(buffer, f.name, f.type, MERCH_BUCKET)
    }))

    const listing = await prisma.merchListing.create({
      data: {
        title: meta.title,
        slug,
        category: meta.category,
        price: meta.price,
        isNegotiable: meta.isNegotiable,
        condition: meta.condition,
        description: meta.description,
        location: meta.location,
        whatsapp: meta.whatsapp,
        sellerId: user.id,
        images: { create: uploaded.map((u, i) => ({ url: u.publicUrl, path: u.path, order: i })) },
      },
      include: { images: true },
    })

    let telegramSent = false
    let telegramError: string | null = null
    try {
      const result = await sendListingForApproval({
        listing,
        seller: { id: user.id, name: user.name, email: user.email },
        imageUrl: listing.images[0]?.url,
      })
      if (result.ok) {
        telegramSent = true
        await prisma.merchListing.update({ where: { id: listing.id }, data: { telegramSent: true, telegramMessageId: result.messageId } })
      } else {
        telegramError = result.error || 'Telegram send failed'
      }
    } catch (e) {
      telegramError = e instanceof Error ? e.message : 'Telegram integration exception occurred'
      console.error('Telegram merch notification failure:', e)
    }
    if (!telegramSent) {
      await prisma.merchListing.update({ where: { id: listing.id }, data: { telegramSent: false, telegramError } })
    }

    return NextResponse.json({ success: true, listing }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ success: false, error: err.issues[0].message, code: 400 }, { status: 400 })
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('merchandise POST DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('merchandise POST error:', err)
    return NextResponse.json({ success: false, error: 'Listing submission failed', code: 500 }, { status: 500 })
  }
}
