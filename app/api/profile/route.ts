import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  college: z.string().trim().max(150).optional().or(z.literal('')),
  university: z.string().trim().max(150).optional().or(z.literal('')),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const body = await req.json()
    const { name, college, university } = schema.parse(body)

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: { name, college: college || null, university: university || null },
    })
    return NextResponse.json({ success: true, user })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues[0].message, code: 400 }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('profile PATCH DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('profile PATCH error:', err)
    return NextResponse.json({ success: false, error: 'Failed to update profile', code: 500 }, { status: 500 })
  }
}
