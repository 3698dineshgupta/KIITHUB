import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const { listingId } = await req.json()
    if (!listingId) return NextResponse.json({ success: false, error: 'listingId required', code: 400 }, { status: 400 })

    const save = await prisma.merchSave.upsert({
      where: { userId_listingId: { userId: session.user.id, listingId } },
      create: { userId: session.user.id, listingId },
      update: {},
    })

    return NextResponse.json({ success: true, save })
  } catch (err) {
    console.error('merchandise/save POST error:', err)
    return NextResponse.json({ success: false, error: 'Failed to save listing', code: 500 }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const { listingId } = await req.json()
    if (!listingId) return NextResponse.json({ success: false, error: 'listingId required', code: 400 }, { status: 400 })

    await prisma.merchSave.deleteMany({ where: { userId: session.user.id, listingId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('merchandise/save DELETE error:', err)
    return NextResponse.json({ success: false, error: 'Failed to remove saved listing', code: 500 }, { status: 500 })
  }
}
