import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPremiumActive } from '@/lib/utils'
import { generateRequestCode } from '@/lib/requests'
import { notifyRequestReceived } from '@/lib/request-notify'
import { getRequestIp } from '@/lib/request-ip'
import { checkRateLimit } from '@/lib/ratelimit'

const schema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(2000),
  branch: z.string().trim().max(50).optional(),
  semester: z.string().trim().max(50).optional(),
})

// Request Hub is a premium feature — gated the same way document access is
// (lib/utils.ts isPremiumActive), not just hidden behind UI: the page shows
// a paywall for non-premium users, but this route re-checks server-side
// since it's the actual write path.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    if (!isPremiumActive(user.membershipStatus, user.membershipExpiry)) {
      return NextResponse.json({ success: false, error: 'Request Hub is a premium feature', premiumGate: true, code: 403 }, { status: 403 })
    }

    // Logged-in and premium already rules out most abuse, but a generous
    // per-user cap still protects against runaway automation.
    const withinBudget = await checkRateLimit(`request:${user.id}`, 10, 86400)
    if (!withinBudget) {
      return NextResponse.json({ success: false, error: 'You have reached the daily request limit. Please try again tomorrow.', code: 429 }, { status: 429 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message, code: 400 }, { status: 400 })
    }
    const data = parsed.data
    const ip = getRequestIp(req)

    const requestCode = generateRequestCode()
    const request = await prisma.contentRequest.create({
      data: {
        requestCode,
        userId: user.id,
        title: data.title,
        description: data.description,
        branch: data.branch || null,
        semester: data.semester || null,
      },
    })

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'REQUEST_CREATED', resource: 'content_request', resourceId: request.id, ipAddress: ip },
    })

    await notifyRequestReceived(user.id, requestCode).catch(() => {})

    return NextResponse.json({ success: true, requestCode, id: request.id }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('requests POST error:', err)
    return NextResponse.json({ success: false, error: 'Failed to submit request', code: 500 }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const requests = await prisma.contentRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, requests })
  } catch (err) {
    console.error('requests GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load requests', code: 500 }, { status: 500 })
  }
}
