import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { downloadPDFFromTelegram } from '@/lib/telegram'
import { verifyPDFAccessToken } from '@/lib/auth/jwt'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get token from query params
    const token = req.nextUrl.searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    // Verify token
    const tokenData = await verifyPDFAccessToken(token)
    
    if (!tokenData || tokenData.pdfId !== params.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    // Get PDF from database
    const pdf = await prisma.pDF.findUnique({
      where: { id: params.id },
    })

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }

    // Check premium access
    if (pdf.isPremium && !tokenData.isPremium) {
      return NextResponse.json({ error: 'Premium access required' }, { status: 403 })
    }

    // Download PDF from Telegram
    const pdfBuffer = await downloadPDFFromTelegram(pdf.telegramFileId)

    // Stream PDF to client
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${pdf.title}.pdf"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('PDF streaming error:', error)
    return NextResponse.json(
      { error: 'Failed to stream PDF' },
      { status: 500 }
    )
  }
}
