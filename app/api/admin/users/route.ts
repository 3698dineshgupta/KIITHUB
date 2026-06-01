import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
  const search = req.nextUrl.searchParams.get('search') ?? ''
  const LIMIT = 20
  const where: any = {}
  if (search) where.OR = [{ name:{ contains:search,mode:'insensitive' } },{ email:{ contains:search,mode:'insensitive' } }]
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy:{ createdAt:'desc' }, skip:(page-1)*LIMIT, take:LIMIT, select:{ id:true,name:true,email:true,role:true,membershipStatus:true,membershipExpiry:true,createdAt:true,_count:{ select:{ downloads:true,bookmarks:true } } } }),
    prisma.user.count({ where }),
  ])
  return NextResponse.json({ users, total, pages: Math.ceil(total/LIMIT) })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId, action } = await req.json()
  let data: any = {}
  if (action === 'grant_premium') {
    const expiry = new Date(); expiry.setDate(expiry.getDate() + 365)
    data = { membershipStatus: 'PREMIUM', membershipExpiry: expiry }
  } else if (action === 'revoke_premium') {
    data = { membershipStatus: 'FREE', membershipExpiry: null }
  } else if (action === 'make_admin') { data = { role: 'ADMIN' }
  } else if (action === 'make_student') { data = { role: 'STUDENT' } }
  const user = await prisma.user.update({ where: { id: userId }, data, select: { id:true,name:true,role:true,membershipStatus:true } })
  return NextResponse.json({ success: true, user })
}
