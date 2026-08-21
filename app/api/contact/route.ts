import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRequestIp } from '@/lib/request-ip'
import { checkRateLimit } from '@/lib/ratelimit'
import { sendContactAdminNotification, sendContactConfirmationEmail } from '@/lib/mail'

const schema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(3000),
})

// Open to everyone, logged in or not — same anonymous-allowed,
// IP-rate-limited shape as app/api/bugs/route.ts.
export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req)
    const withinBudget = await checkRateLimit(`contact:${ip ?? 'unknown'}`, 5, 3600)
    if (!withinBudget) {
      return NextResponse.json({ success: false, error: 'Too many messages sent. Please try again later.', code: 429 }, { status: 429 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message, code: 400 }, { status: 400 })
    }
    const data = parsed.data

    const session = await auth()
    const userId = session?.user?.id ?? null

    await prisma.contactMessage.create({
      data: {
        userId,
        name: data.name || null,
        email: data.email,
        message: data.message,
        ipAddress: ip,
      },
    })

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      await sendContactAdminNotification({ adminEmail, visitorEmail: data.email, visitorName: data.name, message: data.message }).catch(() => {})
    }
    await sendContactConfirmationEmail(data.email, data.name).catch(() => {})

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('contact POST error:', err)
    return NextResponse.json({ success: false, error: 'Failed to send message', code: 500 }, { status: 500 })
  }
}
