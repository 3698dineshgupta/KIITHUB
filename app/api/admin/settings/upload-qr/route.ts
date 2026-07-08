import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { isAllowedImageType, extensionForImageType } from '@/lib/file-validation'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    if (!isAllowedImageType(file.type)) {
      return NextResponse.json({ error: 'Only PNG, JPEG, WEBP, or GIF images are allowed' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'settings')
    await mkdir(uploadDir, { recursive: true })

    // Extension comes from the validated MIME type, never from the
    // client-supplied filename.
    const filename = `qr_${Date.now()}${extensionForImageType(file.type)}`
    const filepath = path.join(uploadDir, filename)
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    const url = `/uploads/settings/${filename}`
    return NextResponse.json({ success: true, url })
  } catch (err: any) {
    console.error('QR upload error:', err)
    return NextResponse.json({ error: 'QR code upload failed' }, { status: 500 })
  }
}
