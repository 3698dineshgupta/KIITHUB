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
import { createClient } from '@supabase/supabase-js'

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
// The form sends the `file` part before the `meta` part, so by the time
// bytes are streaming in we don't yet know which storage provider this
// upload will use — this raw cap only guards against pathological sizes and
// must stay above Telegram's real limit (checked separately below, once
// meta is available) so a Supabase-routed upload never gets truncated.
const MAX_SIZE = 100 * 1024 * 1024 // 100 MB
// Telegram's bot getFile method — how the site later streams a document back
// out — hard-caps at 20MB regardless of upload method; this is Telegram's
// own platform limit, not configurable. A file saved above this would
// upload fine (sendDocument's own limit is a separate, higher ~50MB) and
// then be permanently unviewable, so anything over a safe margin below it
// gets compressed first for Telegram-bound uploads.
const TELEGRAM_SAFE_LIMIT = 19 * 1024 * 1024 // 19 MB, leaving headroom

// Same compression trigger applies to Supabase-bound uploads: the
// `documents` bucket has no file_size_limit override (confirmed via the
// Storage API — it's null), so a reject there comes from the Supabase
// project's own default cap. Compressing anything over 19MB first — the
// same threshold as Telegram, for one consistent behavior — keeps uploads
// comfortably under that project default regardless of its exact value.
const SUPABASE_SAFE_LIMIT = 45 * 1024 * 1024 // 45 MB, headroom below the ~50MB project default

const ILOVEPDF_API = 'https://api.ilovepdf.com/v1'

// Plain-JS mirror of lib/ilovepdf.ts — this script runs standalone via
// `node`, outside Next's module resolution, so it can't import from lib/.
async function compressPdf(buffer, filename) {
  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY
  if (!publicKey) throw new Error('ILOVEPDF_PUBLIC_KEY is not set')

  const authRes = await fetch(`${ILOVEPDF_API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_key: publicKey }),
  })
  if (!authRes.ok) throw new Error(`iLovePDF auth failed (${authRes.status})`)
  const { token } = await authRes.json()

  const startRes = await fetch(`${ILOVEPDF_API}/start/compress`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!startRes.ok) throw new Error(`iLovePDF start task failed (${startRes.status})`)
  const { server, task } = await startRes.json()

  const uploadForm = new FormData()
  uploadForm.append('task', task)
  uploadForm.append('file', new Blob([buffer], { type: 'application/pdf' }), filename)
  const uploadRes = await fetch(`https://${server}/v1/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: uploadForm,
  })
  if (!uploadRes.ok) throw new Error(`iLovePDF upload failed (${uploadRes.status})`)
  const { server_filename } = await uploadRes.json()

  const processRes = await fetch(`https://${server}/v1/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task,
      tool: 'compress',
      files: [{ server_filename, filename }],
      compression_level: 'recommended',
    }),
  })
  if (!processRes.ok) throw new Error(`iLovePDF compression failed (${processRes.status})`)

  const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!downloadRes.ok) throw new Error(`iLovePDF download failed (${downloadRes.status})`)
  const arrayBuffer = await downloadRes.arrayBuffer()
  const compressed = Buffer.from(arrayBuffer)

  return { buffer: compressed, originalSize: buffer.length, compressedSize: compressed.length }
}

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

let _supabase = null
function getSupabaseClient() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || 'https://qbgmidxjhqznldfpvory.supabase.co'
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    console.log('[DEBUG] SUPABASE_SERVICE_ROLE_KEY is:', key ? (key.substring(0, 10) + '...' + key.length + ' chars') : 'empty');
    _supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  }
  return _supabase
}

async function supabaseUpload(buffer, fileName, bucketName = 'documents') {
  const fileExtension = fileName.split('.').pop() || 'pdf'
  const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName
  const cleanBase = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')
  const timestamp = Date.now()
  const uniqueName = `${cleanBase}_${timestamp}.${fileExtension}`
  
  const client = getSupabaseClient()
  const { data, error } = await client.storage
    .from(bucketName)
    .upload(uniqueName, buffer, {
      contentType: 'application/pdf',
      upsert: true
    })
  
  if (error) {
    console.error('Supabase upload error detail:', error)
    throw new Error(`Supabase upload failed: ${error.message}`)
  }
  return {
    path: data.path,
    fileSize: buffer.length
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
    // Busboy's `limits.fileSize` silently stops reading past the cap instead
    // of rejecting the upload — without this flag, a file that hit the limit
    // would still reach the 'finish' handler with a truncated buffer, get
    // uploaded to Telegram/Supabase as if it were complete, and save a
    // corrupted, unreadable PDF into the DB with no error anywhere.
    let truncated = false

    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_SIZE } })

    bb.on('file', (_field, stream, info) => {
      fileName = info.filename
      const chunks = []
      stream.on('data', (chunk) => {
        totalSize += chunk.length
        chunks.push(chunk)
      })
      stream.on('limit', () => { truncated = true })
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
        if (truncated) {
          res.writeHead(413, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `File exceeds the ${(MAX_SIZE / 1024 / 1024).toFixed(0)} MB upload limit` }))
          return resolve()
        }
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

        // Retrieve settings from the DB for storage provider defaults
        const dbSettings = await prisma.setting.findMany().catch(() => [])
        const settingsMap = Object.fromEntries(dbSettings.map(s => [s.key, s.value]))
        
        const storageProvider = meta.storageProvider || settingsMap.storage_provider || 'telegram'
        const supabaseBucket = settingsMap.supabase_bucket || 'documents'

        let fileId = ''
        let msgId = ''
        let fileSize = 0

        // One shared compression trigger (19MB) for both providers —
        // Telegram's getFile can never serve anything over ~19-20MB no
        // matter what, and Supabase's project-wide default cap rejects this
        // same file today, so there's no provider where staying
        // uncompressed above this line works. What differs is the ceiling
        // AFTER compression: Telegram still needs to land under 19MB, but
        // Supabase has real headroom up to its own limit.
        if (fileBuffer.length > TELEGRAM_SAFE_LIMIT) {
          const postCompressionCeiling = storageProvider === 'supabase' ? SUPABASE_SAFE_LIMIT : TELEGRAM_SAFE_LIMIT
          const providerName = storageProvider === 'supabase' ? 'Supabase' : "Telegram's ~19 MB serving limit"

          console.log(`[Upload] ${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB exceeds the safe limit — compressing via iLovePDF...`)
          let compressed
          try {
            compressed = await compressPdf(fileBuffer, fileName)
          } catch (err) {
            console.error('[Upload] iLovePDF compression error:', err)
            res.writeHead(413, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              error: `File is ${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB and compression failed. Try a smaller file.`,
            }))
            return resolve()
          }
          if (compressed.compressedSize > postCompressionCeiling) {
            res.writeHead(413, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              error: `Compressed from ${(compressed.originalSize / 1024 / 1024).toFixed(1)} MB to ${(compressed.compressedSize / 1024 / 1024).toFixed(1)} MB, still over ${providerName}.${storageProvider === 'supabase' ? ' Try compressing the PDF further before uploading.' : ' Use Supabase for this file instead.'}`,
            }))
            return resolve()
          }
          console.log(`[Upload] Compressed ${(compressed.originalSize / 1024 / 1024).toFixed(1)} MB → ${(compressed.compressedSize / 1024 / 1024).toFixed(1)} MB`)
          fileBuffer = compressed.buffer
        }

        if (storageProvider === 'supabase') {
          console.log('[Upload] Uploading to Supabase Storage...')
          const supResult = await supabaseUpload(fileBuffer, fileName, supabaseBucket)
          console.log('[Upload] Supabase upload success, path:', supResult.path)
          fileId = supResult.path
          msgId = 'supabase'
          fileSize = supResult.fileSize
        } else {
          console.log('[Upload] Uploading to Telegram...')
          const tgResult = await telegramUpload(fileBuffer, fileName, meta.title)
          console.log('[Upload] Telegram upload success, fileId:', tgResult.fileId)
          fileId = tgResult.fileId
          msgId = tgResult.messageId
          fileSize = tgResult.fileSize
        }

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
              telegramFileId: fileId, telegramMsgId: msgId,
              fileSize: fileSize,
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
            telegramFileId: fileId, telegramMsgId: msgId,
            fileSize: fileSize,
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
  // Strip query string and a trailing slash so `/api/upload/` or
  // `/api/upload?x=1` (either could plausibly reach here depending on how
  // the browser or an extension normalizes the request) still match instead
  // of silently 404ing.
  const pathname = (req.url || '').split('?')[0].replace(/\/$/, '') || '/'
  console.log(`[Upload] ${req.method} ${req.url}`)
  if (pathname === '/api/upload') {
    await handleUpload(req, res)
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found', requestedUrl: req.url }))
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
