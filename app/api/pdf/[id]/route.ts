import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    const pdf = await prisma.pDF.findUnique({ where: { id: params.id } })
    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }

    let isBookmarked = false
    if (userId) {
      const user = await prisma.user.findUnique({ where: { clerkId: userId } })
      if (user) {
        const bookmark = await prisma.bookmark.findUnique({
          where: { userId_pdfId: { userId: user.id, pdfId: pdf.id } },
        })
        isBookmarked = !!bookmark
      }
    }

    return NextResponse.json({ success: true, pdf: { ...pdf, isBookmarked } })
  } catch (error) {
    console.error('PDF detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 })
  }
}
