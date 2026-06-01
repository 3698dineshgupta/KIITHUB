import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Upsert user – create if first visit
    const clerkUser = await currentUser()
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        name: `${clerkUser?.firstName ?? ''} ${clerkUser?.lastName ?? ''}`.trim() || 'Student',
        email: clerkUser?.emailAddresses[0]?.emailAddress ?? '',
        role:
          clerkUser?.emailAddresses[0]?.emailAddress ===
          process.env.ADMIN_EMAIL
            ? 'ADMIN'
            : 'USER',
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
  }
}
