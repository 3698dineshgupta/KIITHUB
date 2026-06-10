import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPaymentProofToTelegram } from '@/lib/telegram'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Allow up to 20 MB for high-res payment screenshots
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '20mb',
  },
}

export const maxDuration = 60

// Student submits payment screenshot
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ success: false, error: 'User not found', code: 404 }, { status: 404 })

    // Check for existing pending request
    const existing = await prisma.paymentRequest.findFirst({
      where: { userId: user.id, status: 'PENDING' },
    })
    if (existing) {
      return NextResponse.json({ success: false, error: 'You already have a pending payment request', code: 409 }, { status: 409 })
    }

    const form = await req.formData()
    const transactionId = form.get('transactionId') as string
    const screenshotFile = form.get('screenshot') as File | null
    const notes = form.get('notes') as string | null

    if (!transactionId || !screenshotFile) {
      return NextResponse.json({ success: false, error: 'Transaction ID and screenshot required', code: 400 }, { status: 400 })
    }

    // Validate screenshot file type and size
    if (!screenshotFile.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Only images are allowed as proof of payment', code: 400 }, { status: 400 })
    }
    if (screenshotFile.size > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Screenshot too large (max 15 MB)', code: 400 }, { status: 400 })
    }

    // Vercel serverless functions are read-only, so we DO NOT save the screenshot locally.
    // The admin will verify the screenshot via the Telegram channel.
    const screenshotUrl = 'Sent to Telegram'

    // Fetch dynamic pricing and validity from admin settings
    const [priceSetting, daysSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'premium_price' } }),
      prisma.setting.findUnique({ where: { key: 'premium_days' } }),
    ])
    const amount = priceSetting ? parseFloat(priceSetting.value) : 299
    const membershipDays = daysSetting ? parseInt(daysSetting.value) : 365

    // Send screenshot to Telegram Bot with dynamic parameters
    let telegramSent = false
    let telegramError: string | null = null
    try {
      const tgSuccess = await sendPaymentProofToTelegram({
        userName: user.name,
        userEmail: user.email,
        transactionId,
        amount,
        membershipDays,
        date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        screenshot: screenshotFile,
        notes,
      })
      if (tgSuccess) {
        telegramSent = true
      } else {
        telegramError = 'Telegram sendPhoto returned failure status'
      }
    } catch (e: any) {
      telegramError = e.message || 'Telegram integration exception occurred'
      console.error('Telegram notification failure during payment submission:', e)
    }

    // Update user to PENDING
    await prisma.user.update({
      where: { id: user.id },
      data: { membershipStatus: 'PENDING' },
    })

    const payment = await prisma.paymentRequest.create({
      data: {
        userId: user.id,
        transactionId,
        screenshotUrl,
        amount,
        membershipDays,
        notes: notes ?? undefined,
        telegramSent,
        telegramError,
      },
    })

    return NextResponse.json({ success: true, payment }, { status: 201 })
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('payment POST DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error(err)
    return NextResponse.json({ success: false, error: 'Payment submission failed', code: 500 }, { status: 500 })
  }
}

// Admin approves/rejects
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'MODERATOR')) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
    }

    const body = await req.json()
    const { paymentId, action } = body

    const payment = await prisma.paymentRequest.findUnique({
      where: { id: paymentId }, include: { user: true },
    })
    if (!payment) return NextResponse.json({ success: false, error: 'Payment not found', code: 404 }, { status: 404 })

    // Use admin-provided days, or fall back to the days stored when the user submitted payment
    const membershipDays = Number(body.membershipDays ?? payment.membershipDays ?? 90)

    if (action === 'approve') {
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + membershipDays)

      await prisma.$transaction([
        prisma.paymentRequest.update({
          where: { id: paymentId },
          data: { status: 'APPROVED', approvedById: admin.id, approvedAt: new Date(), membershipDays },
        }),
        prisma.user.update({
          where: { id: payment.userId },
          data: { membershipStatus: 'PREMIUM', membershipExpiry: expiry },
        }),
        prisma.notification.create({
          data: {
            userId: payment.userId,
            type: 'MEMBERSHIP_APPROVED',
            title: 'Premium Activated!',
            message: `Your premium membership is now active for ${membershipDays} days. Enjoy unlimited access!`,
          },
        }),
      ])
    } else if (action === 'reject') {
      await prisma.$transaction([
        prisma.paymentRequest.update({
          where: { id: paymentId },
          data: { status: 'REJECTED', approvedById: admin.id, approvedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: payment.userId },
          data: { membershipStatus: 'FREE' },
        }),
        prisma.notification.create({
          data: {
            userId: payment.userId,
            type: 'MEMBERSHIP_REJECTED',
            title: 'Payment Verification Failed',
            message: 'Your payment could not be verified. Please contact support or resubmit.',
          },
        }),
      ])
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('payment PATCH DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error(err)
    return NextResponse.json({ success: false, error: 'Payment update failed', code: 500 }, { status: 500 })
  }
}
