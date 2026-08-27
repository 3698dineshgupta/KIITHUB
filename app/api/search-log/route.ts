import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRequestIp } from '@/lib/request-ip'
import { checkRateLimit } from '@/lib/ratelimit'

const schema = z.object({
  query: z.string().trim().min(1).max(200),
  page: z.enum(['notes', 'pyq', 'merchandise']),
})

// Called once per debounced search commit (hooks/use-debounced-param.ts'
// onCommit in the notes/PYQ and merchandise filter bars) — not on every
// keystroke or page re-render, so this reflects genuine search intent.
// Anonymous visitors are logged too (userId null) — only IP-rate-limited,
// since the admin per-user view is just one read of this same data.
export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req)
    const withinBudget = await checkRateLimit(`searchlog:${ip ?? 'unknown'}`, 30, 3600)
    if (!withinBudget) return NextResponse.json({ success: false }, { status: 429 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ success: false }, { status: 400 })

    const session = await auth()
    await prisma.searchLog.create({
      data: { userId: session?.user?.id ?? null, query: parsed.data.query, page: parsed.data.page },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    // Best-effort — logging failures should never surface to the user.
    console.error('search-log POST error:', err)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
