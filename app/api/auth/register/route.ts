import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateUniqueReferralCode, creditReferral } from '@/lib/referral'
import { getRequestIp } from '@/lib/request-ip'

const schema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  ref: z.string().trim().min(1).max(32).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, ref } = schema.parse(body)

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const referralCode = await generateUniqueReferralCode()

    // Public registration ALWAYS creates STUDENT role.
    // Admin accounts can only be created via: node scripts/create-admin.mjs
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: 'STUDENT', referralCode },
      select: { id: true, name: true, email: true, role: true },
    })

    if (ref && ref.toUpperCase() !== referralCode) {
      await creditReferral({ newUserId: user.id, referralCode: ref.toUpperCase(), ipAddress: getRequestIp(req) })
    }

    return NextResponse.json({ success: true, user }, { status: 201 })
  } catch (err: any) {
    // Handle validation errors explicitly
    if (err?.name === 'ZodError') {
      return NextResponse.json({ success: false, error: err.errors[0].message, code: 400 }, { status: 400 })
    }
    // Handle DB connectivity / Prisma initialization errors
    const msg = String(err?.message ?? '')
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      console.error('register POST DB error:', err)
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error(err)
    return NextResponse.json({ success: false, error: 'Registration failed', code: 500 }, { status: 500 })
  }
}
