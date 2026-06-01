import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { ExamType } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    const searchParams = req.nextUrl.searchParams

    const search = searchParams.get('search') || ''
    const school = searchParams.get('school') || ''
    const branch = searchParams.get('branch') || ''
    const semester = searchParams.get('semester')
    const year = searchParams.get('year')
    const examType = searchParams.get('examType') as ExamType | null
    const sortBy = searchParams.get('sortBy') || 'latest'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (school) where.school = school
    if (branch) where.branch = branch
    if (semester) where.semester = parseInt(semester)
    if (year) where.year = parseInt(year)
    if (examType) where.examType = examType

    const orderBy: any =
      sortBy === 'popular'
        ? { views: 'desc' }
        : sortBy === 'title'
        ? { title: 'asc' }
        : { createdAt: 'desc' }

    const [pdfs, total] = await Promise.all([
      prisma.pDF.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pDF.count({ where }),
    ])

    // If signed in, attach bookmark status
    let bookmarkedIds: Set<string> = new Set()
    if (userId) {
      const user = await prisma.user.findUnique({ where: { clerkId: userId } })
      if (user) {
        const bookmarks = await prisma.bookmark.findMany({
          where: { userId: user.id, pdfId: { in: pdfs.map((p) => p.id) } },
          select: { pdfId: true },
        })
        bookmarkedIds = new Set(bookmarks.map((b) => b.pdfId))
      }
    }

    const enriched = pdfs.map((pdf) => ({
      ...pdf,
      isBookmarked: bookmarkedIds.has(pdf.id),
    }))

    return NextResponse.json({
      success: true,
      pdfs: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('PDF list error:', error)
    return NextResponse.json({ error: 'Failed to fetch PDFs' }, { status: 500 })
  }
}
