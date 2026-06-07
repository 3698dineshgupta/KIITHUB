import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/redis'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Forbidden', code: 403 }, { status: 403 })
    const cached = await cache.get<any>('admin:analytics')
    if (cached) return NextResponse.json(cached)
    const d7 = new Date(Date.now() - 7 * 86400000)
    const [totalUsers,premiumUsers,totalNotes,totalPYQs,totalDownloads,pendingPayments,recentUsers,recentViews,topNotes] = await Promise.all([
      prisma.user.count(), prisma.user.count({ where:{ membershipStatus:'PREMIUM' } }),
      prisma.note.count({ where:{ isPublished:true } }), prisma.pYQ.count({ where:{ isPublished:true } }),
      prisma.download.count(), prisma.paymentRequest.count({ where:{ status:'PENDING' } }),
      prisma.user.count({ where:{ createdAt:{ gte:d7 } } }), prisma.view.count({ where:{ createdAt:{ gte:d7 } } }),
      prisma.note.findMany({ where:{ isPublished:true }, orderBy:{ viewCount:'desc' }, take:5, select:{ id:true,title:true,slug:true,viewCount:true,downloadCount:true,isPremium:true } }),
    ])
    const data = { stats:{ totalUsers,premiumUsers,totalNotes,totalPYQs,totalDownloads,pendingPayments,recentUsers,recentViews }, topNotes, premiumRate: totalUsers>0?((premiumUsers/totalUsers)*100).toFixed(1):'0' }
    await cache.set('admin:analytics', data, 300)
    return NextResponse.json(data)
  } catch (err: any) {
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('admin/analytics GET DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('admin/analytics error:', err)
    return NextResponse.json({ success: false, error: 'Analytics fetch failed', code: 500 }, { status: 500 })
  }
}
