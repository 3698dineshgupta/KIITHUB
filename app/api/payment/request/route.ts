import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const formData = await req.formData()
    const transactionId = formData.get('transactionId') as string
    const notes = formData.get('notes') as string | null
    const screenshotFile = formData.get('screenshot') as File | null

    if (!transactionId || !screenshotFile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // In production: upload screenshotFile to Cloudinary / S3 and get URL
    // For now we store a placeholder
    const screenshotUrl = `uploads/${Date.now()}-${screenshotFile.name}`

    const payment = await prisma.paymentRequest.create({
      data: {
        userId: user.id,
        screenshot: screenshotUrl,
        transactionId,
        amount: 299,
        notes: notes ?? undefined,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ success: true, payment })
  } catch (error) {
    console.error('Payment request error:', error)
    return NextResponse.json({ error: 'Failed to submit payment' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) return NextResponse.json({ payments: [] })

    const payments = await prisma.paymentRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, payments })
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json({ error: 'Failed to get payments' }, { status: 500 })
  }
}
