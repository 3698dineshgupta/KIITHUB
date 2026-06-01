import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { generatePDFAccessToken } from '@/lib/auth/jwt'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get PDF
    const pdf = await prisma.pDF.findUnique({
      where: { id: params.id },
    })

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }

    // Check if premium required and user has premium
    const isPremium = user.premiumStatus && (!user.premiumExpiry || new Date(user.premiumExpiry) > new Date())

    // Increment view count
    await prisma.pDF.update({
      where: { id: params.id },
      data: { views: { increment: 1 } },
    })

    // Add to view history
    await prisma.viewHistory.create({
      data: {
        userId: user.id,
        pdfId: pdf.id,
      },
    })

    // Generate access token
    const token = await generatePDFAccessToken(
      pdf.id,
      user.id,
      isPremium
    )

    return NextResponse.json({
      success: true,
      token,
      isPremium,
      requiresPremium: pdf.isPremium,
      previewPages: pdf.previewPages,
    })
  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate access token' },
      { status: 500 }
    )
  }
}
