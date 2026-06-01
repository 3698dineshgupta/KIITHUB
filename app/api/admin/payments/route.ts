import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const status = req.nextUrl.searchParams.get('status')
  const payments = await prisma.paymentRequest.findMany({
    where: status ? { status: status as any } : {},
    include: { user: { select: { id:true, name:true, email:true, membershipStatus:true } } },
    orderBy: { createdAt: 'desc' }, take: 50,
  })
  return NextResponse.json({ payments })
}
