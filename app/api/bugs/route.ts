import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cloudinaryUploadImage, cloudinaryUploadVideo, BUG_REPORT_FOLDER } from '@/lib/cloudinary'
import { generateBugId, BUG_CATEGORIES, BUG_SEVERITIES } from '@/lib/bugs'
import { notifyBugReportReceived } from '@/lib/bug-notify'
import { getRequestIp } from '@/lib/request-ip'
import { checkRateLimit } from '@/lib/ratelimit'
import { isAllowedImageType } from '@/lib/file-validation'

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_RECORDING_SIZE = 30 * 1024 * 1024 // 30 MB

const schema = z.object({
  title: z.string().trim().min(3).max(150),
  category: z.enum(BUG_CATEGORIES),
  description: z.string().trim().min(10).max(5000),
  stepsToReproduce: z.string().trim().max(3000).optional(),
  expectedBehavior: z.string().trim().max(2000).optional(),
  actualBehavior: z.string().trim().max(2000).optional(),
  severity: z.enum(BUG_SEVERITIES).optional(),
  pageUrl: z.string().trim().max(500).optional(),
  browserInfo: z.string().trim().max(200).optional(),
  deviceInfo: z.string().trim().max(200).optional(),
  os: z.string().trim().max(100).optional(),
  screenResolution: z.string().trim().max(50).optional(),
  appVersion: z.string().trim().max(50).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal('')),
})

// Bug reports are allowed without login (spec: optional Contact Email
// implies anonymous submission is valid) — rate limited by IP instead of by
// account to prevent spam from either path.
export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req)
    const withinBudget = await checkRateLimit(`bugreport:${ip ?? 'unknown'}`, 5, 3600)
    if (!withinBudget) {
      return NextResponse.json({ success: false, error: 'Too many reports submitted. Please try again later.', code: 429 }, { status: 429 })
    }

    const session = await auth()
    const userId = session?.user?.id ?? null

    const form = await req.formData()
    const raw: Record<string, string> = {}
    for (const key of [
      'title', 'category', 'description', 'stepsToReproduce', 'expectedBehavior',
      'actualBehavior', 'severity', 'pageUrl', 'browserInfo', 'deviceInfo', 'os',
      'screenResolution', 'appVersion', 'contactEmail',
    ]) {
      const value = form.get(key)
      if (typeof value === 'string') raw[key] = value
    }
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message, code: 400 }, { status: 400 })
    }
    const data = parsed.data

    let screenshotUrl: string | undefined
    const screenshot = form.get('screenshot')
    if (screenshot instanceof File && screenshot.size > 0) {
      if (!isAllowedImageType(screenshot.type)) {
        return NextResponse.json({ success: false, error: 'Screenshot must be a PNG, JPEG, WEBP, or GIF image', code: 400 }, { status: 400 })
      }
      if (screenshot.size > MAX_SCREENSHOT_SIZE) {
        return NextResponse.json({ success: false, error: 'Screenshot must be under 5 MB', code: 400 }, { status: 400 })
      }
      const buf = Buffer.from(await screenshot.arrayBuffer())
      const uploaded = await cloudinaryUploadImage(buf, screenshot.name, BUG_REPORT_FOLDER)
      screenshotUrl = uploaded.url
    }

    let recordingUrl: string | undefined
    const recording = form.get('recording')
    if (recording instanceof File && recording.size > 0) {
      if (!recording.type.startsWith('video/')) {
        return NextResponse.json({ success: false, error: 'Screen recording must be a video file', code: 400 }, { status: 400 })
      }
      if (recording.size > MAX_RECORDING_SIZE) {
        return NextResponse.json({ success: false, error: 'Screen recording must be under 30 MB', code: 400 }, { status: 400 })
      }
      const buf = Buffer.from(await recording.arrayBuffer())
      const uploaded = await cloudinaryUploadVideo(buf, recording.name)
      recordingUrl = uploaded.url
    }

    const bugId = generateBugId()
    const report = await prisma.bugReport.create({
      data: {
        bugId,
        userId,
        title: data.title,
        category: data.category,
        description: data.description,
        stepsToReproduce: data.stepsToReproduce || null,
        expectedBehavior: data.expectedBehavior || null,
        actualBehavior: data.actualBehavior || null,
        severity: data.severity || 'MEDIUM',
        pageUrl: data.pageUrl || null,
        browserInfo: data.browserInfo || null,
        deviceInfo: data.deviceInfo || null,
        os: data.os || null,
        screenResolution: data.screenResolution || null,
        appVersion: data.appVersion || null,
        contactEmail: data.contactEmail || null,
        screenshotUrl: screenshotUrl || null,
        recordingUrl: recordingUrl || null,
        ipAddress: ip,
      },
    })

    await prisma.auditLog.create({
      data: { userId, action: 'BUG_REPORT_CREATED', resource: 'bug_report', resourceId: report.id, ipAddress: ip },
    })

    if (userId) await notifyBugReportReceived(userId, bugId).catch(() => {})

    return NextResponse.json({ success: true, bugId, id: report.id }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes("Can't reach database") || msg.includes('PrismaClientInitializationError') || msg.includes('Database unavailable')) {
      return NextResponse.json({ success: false, error: 'Service temporarily unavailable', code: 503 }, { status: 503 })
    }
    console.error('bugs POST error:', err)
    return NextResponse.json({ success: false, error: 'Failed to submit report', code: 500 }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })

    const reports = await prisma.bugReport.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, reports })
  } catch (err) {
    console.error('bugs GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to load reports', code: 500 }, { status: 500 })
  }
}
