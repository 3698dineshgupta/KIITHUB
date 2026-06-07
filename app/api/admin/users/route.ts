import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })
    const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
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
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('admin/users GET DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('admin/users error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch users', code: 500 }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })
    const admin = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
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
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('admin/users PATCH DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('admin/users PATCH error:', err)
    return NextResponse.json({ success: false, error: 'User update failed', code: 500 }, { status: 500 })
  }
}
