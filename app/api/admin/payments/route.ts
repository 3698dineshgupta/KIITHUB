import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
    const status = req.nextUrl.searchParams.get('status')
    const payments = await prisma.paymentRequest.findMany({
      where: status ? { status: status as any } : {},
      include: { user: { select: { id:true, name:true, email:true, membershipStatus:true } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    })
    return NextResponse.json({ payments })
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('admin/payments GET DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('admin/payments error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch payments', code: 500 }, { status: 500 })
  }
}
