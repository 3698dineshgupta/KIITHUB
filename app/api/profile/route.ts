import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, college, university } = await req.json()
  const user = await prisma.user.update({ where: { email: session.user.email }, data: { name, college, university } })
  return NextResponse.json({ success: true, user })
}
