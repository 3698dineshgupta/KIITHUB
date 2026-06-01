import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Student submits payment screenshot
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Check for existing pending request
  const existing = await prisma.paymentRequest.findFirst({
    where: { userId: user.id, status: 'PENDING' },
  })
  if (existing) {
    return NextResponse.json({ error: 'You already have a pending payment request' }, { status: 409 })
  }

  const form = await req.formData()
  const transactionId = form.get('transactionId') as string
  const screenshotFile = form.get('screenshot') as File | null
  const notes = form.get('notes') as string | null

  if (!transactionId || !screenshotFile) {
    return NextResponse.json({ error: 'Transaction ID and screenshot required' }, { status: 400 })
  }

  // In production: upload screenshot to Cloudinary / S3
  // For now, store as base64 placeholder (replace with real upload)
  const screenshotBuffer = Buffer.from(await screenshotFile.arrayBuffer())
  const screenshotUrl = `data:${screenshotFile.type};base64,${screenshotBuffer.toString('base64').slice(0, 100)}...`

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
      notes: notes ?? undefined,
    },
  })

  return NextResponse.json({ success: true, payment }, { status: 201 })
}

// Admin approves/rejects
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { paymentId, action, membershipDays = 365 } = await req.json()

  const payment = await prisma.paymentRequest.findUnique({
    where: { id: paymentId }, include: { user: true },
  })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

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
}
