import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { uploadPDFToTelegram } from '@/lib/telegram'
import { ExamType } from '@prisma/client'

async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user || user.role !== 'ADMIN') throw new Error('Forbidden')
  return user
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await requireAdmin(userId)

    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const school = formData.get('school') as string
    const branch = formData.get('branch') as string
    const semester = parseInt(formData.get('semester') as string)
    const subject = formData.get('subject') as string
    const year = parseInt(formData.get('year') as string)
    const examType = formData.get('examType') as ExamType
    const isPremium = formData.get('isPremium') === 'true'
    const previewPages = parseInt(formData.get('previewPages') as string) || 3

    if (!file || !title || !school || !branch || !semester || !subject || !year || !examType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Validate file size (50MB limit)
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    // Upload to Telegram
    const telegramResult = await uploadPDFToTelegram(file, file.name, title)

    // Save to database
    const pdf = await prisma.pDF.create({
      data: {
        title,
        description,
        school,
        branch,
        semester,
        subject,
        year,
        examType,
        telegramFileId: telegramResult.fileId,
        telegramMessageId: telegramResult.messageId.toString(),
        isPremium,
        previewPages,
        fileSize: telegramResult.fileSize,
      },
    })

    return NextResponse.json({ success: true, pdf })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('PDF upload error:', error)
    return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 })
  }
}
