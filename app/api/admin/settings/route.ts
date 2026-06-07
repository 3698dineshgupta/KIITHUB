import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cache, CACHE_KEYS } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()

    // Upsert each setting key
    const updates = Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), group: 'general' },
      })
    )
    await Promise.all(updates)
    await cache.del(CACHE_KEYS.settings())

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('admin/settings POST error:', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}

export async function GET() {
  try {
    const settings = await prisma.setting.findMany()
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]))
    return NextResponse.json(map)
  } catch (err) {
    console.error('admin/settings GET error:', err)
    return NextResponse.json({}, { status: 200 })
  }
}
