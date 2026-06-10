/**
 * KIIT Hub — Local Upload Server
 * Run: node scripts/local-upload-server.mjs
 * 
 * Use this when uploading PDFs larger than 4 MB.
 * The admin upload form automatically routes large files here.
 * 
 * Requirements: npm install busboy dotenv @prisma/client
 * Make sure your .env.local is present at project root.
 */

import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import Busboy from 'busboy'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
try {
  const env = readFileSync(envPath, 'utf8')
  for (const line of env.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
} catch (e) {
  console.error('Could not read .env.local:', e.message)
}

const prisma = new PrismaClient()
const PORT = process.env.LOCAL_UPLOAD_PORT || 3001
const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

function slugify(t) {
  return t.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

async function telegramUpload(buffer, fileName, caption) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_CHAT_ID
  const API = `https://api.telegram.org/bot${BOT_TOKEN}`

  const form = new FormData()
  form.append('chat_id', CHANNEL_ID)
  form.append('document', new Blob([buffer], { type: 'application/pdf' }), fileName)
  if (caption) form.append('caption', caption.slice(0, 1024))

  const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Telegram upload failed: ${err.description}`)
  }
  const d = await res.json()
  const doc = d.result.document
  return {
    fileId: doc.file_id,
    messageId: String(d.result.message_id),
    fileSize: doc.file_size ?? 0,
    fileName: doc.file_name ?? fileName
  }
}

async function handleUpload(req, res) {
  // CORS headers so the Next.js dev server can call this
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  return new Promise((resolve) => {
    let fileBuffer = null
    let fileName = 'upload.pdf'
    let meta = null
    let totalSize = 0

    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_SIZE } })

    bb.on('file', (_field, stream, info) => {
      fileName = info.filename
      const chunks = []
      stream.on('data', (chunk) => {
        totalSize += chunk.length
        chunks.push(chunk)
      })
      stream.on('end', () => {
        fileBuffer = Buffer.concat(chunks)
      })
    })

    bb.on('field', (name, val) => {
      if (name === 'meta') {
        try { meta = JSON.parse(val) } catch {}
      }
    })

    bb.on('finish', async () => {
      try {
        if (!fileBuffer || !meta) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing file or metadata' }))
          return resolve()
        }

        console.log(`[Upload] Received: ${fileName} (${(totalSize / 1024 / 1024).toFixed(2)} MB)`)

        // Resolve Branch
        let dbBranch = await prisma.branch.findUnique({ where: { shortName: meta.academicBranch } })
        if (!dbBranch) {
          dbBranch = await prisma.branch.create({ data: { name: meta.academicBranch, shortName: meta.academicBranch } })
        }

        // Resolve Semester
        const semNum = parseInt(meta.academicSemester)
        let dbSemester = await prisma.semester.findUnique({ where: { number: semNum } })
        if (!dbSemester) {
          dbSemester = await prisma.semester.create({ data: { number: semNum, label: `Semester ${semNum}` } })
        }

        // Resolve Subject
        let dbSubject = await prisma.subject.findFirst({ where: { name: meta.subjectName, branchId: dbBranch.id, semesterId: dbSemester.id } })
        if (!dbSubject) {
          dbSubject = await prisma.subject.create({ data: { name: meta.subjectName, branchId: dbBranch.id, semesterId: dbSemester.id } })
        }

        // Upload to Telegram
        console.log('[Upload] Uploading to Telegram...')
        const tgResult = await telegramUpload(fileBuffer, fileName, meta.title)
        console.log('[Upload] Telegram upload success, fileId:', tgResult.fileId)

        // Create DB record
        const baseSlug = slugify(meta.title)
        let slug = baseSlug
        let attempt = 0

        if (meta.contentType === 'PYQ') {
          while (await prisma.pYQ.findUnique({ where: { slug } })) {
            attempt++
            slug = `${baseSlug}-${attempt}`
          }
          const pyq = await prisma.pYQ.create({
            data: {
              title: meta.title, slug,
              description: meta.description,
              year: meta.year || new Date().getFullYear(),
              examType: meta.examType || 'End Semester',
              subjectId: dbSubject.id, branchId: dbBranch.id, semesterId: dbSemester.id,
              academicBranch: meta.academicBranch, academicSemester: meta.academicSemester,
              classYear: meta.classYear, isPremium: meta.isPremium,
              telegramFileId: tgResult.fileId, telegramMsgId: tgResult.messageId,
              fileSize: tgResult.fileSize,
            }
          })
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, pyq }))
          return resolve()
        }

        while (await prisma.note.findUnique({ where: { slug } })) {
          attempt++
          slug = `${baseSlug}-${attempt}`
        }
        const note = await prisma.note.create({
          data: {
            title: meta.title, slug,
            description: meta.description,
            contentType: meta.contentType,
            subjectId: dbSubject.id, branchId: dbBranch.id, semesterId: dbSemester.id,
            academicBranch: meta.academicBranch, academicSemester: meta.academicSemester,
            classYear: meta.classYear, isPremium: meta.isPremium,
            telegramFileId: tgResult.fileId, telegramMsgId: tgResult.messageId,
            fileSize: tgResult.fileSize,
            ...(meta.tags?.length ? { tags: { create: meta.tags.map(t => ({ tag: t.toLowerCase().trim() })) } } : {}),
          }
        })

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, note }))
        resolve()
      } catch (err) {
        console.error('[Upload] Error:', err)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: err.message }))
        resolve()
      }
    })

    bb.on('error', (err) => {
      console.error('[Upload] Busboy error:', err)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Failed to parse upload' }))
      resolve()
    })

    req.pipe(bb)
  })
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/upload') {
    await handleUpload(req, res)
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})

server.listen(PORT, () => {
  console.log(`\n✅ KIIT Hub Local Upload Server running at http://localhost:${PORT}`)
  console.log(`   Files > 4 MB will be routed here automatically from the admin panel.\n`)
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
