import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cache, CACHE_KEYS } from '@/lib/redis'
import { telegramGetFileUrl } from '@/lib/telegram'
import { supabaseCreateSignedUrl } from '@/lib/supabase'

const devTiming = process.env.NODE_ENV !== 'production'

export interface StreamDocMeta {
  isPublished: boolean
  isPremium: boolean
  telegramFileId: string
  telegramMsgId: string
  title: string
  fileSize: number | null
}

// pdf.js fetches a document in many small Range requests, not one — each one
// a separate hit to this route. Re-querying Postgres for the note/PYQ row on
// every single one of those (previously ~800-1400ms each, per live
// measurement) multiplied into real cumulative delay across a document
// view. This metadata barely changes after upload, so a short cache absorbs
// that fan-out: 2 minutes bounds staleness to roughly one reading session
// without needing invalidation wired into every edit path.
const DOC_META_TTL = 120

export async function getCachedNoteMeta(id: string): Promise<StreamDocMeta | null> {
  const key = CACHE_KEYS.noteDetail(id)
  const cached = await cache.get<StreamDocMeta>(key)
  if (cached) return cached
  const note = await prisma.note.findUnique({
    where: { id },
    select: { isPublished: true, isPremium: true, telegramFileId: true, telegramMsgId: true, title: true, fileSize: true },
  })
  if (!note) return null
  cache.set(key, note, DOC_META_TTL).catch(() => {})
  return note
}

export async function getCachedPyqMeta(id: string): Promise<StreamDocMeta | null> {
  const key = CACHE_KEYS.pyqDetail(id)
  const cached = await cache.get<StreamDocMeta>(key)
  if (cached) return cached
  const pyq = await prisma.pYQ.findUnique({
    where: { id },
    select: { isPublished: true, isPremium: true, telegramFileId: true, telegramMsgId: true, title: true, fileSize: true },
  })
  if (!pyq) return null
  cache.set(key, pyq, DOC_META_TTL).catch(() => {})
  return pyq
}

function pdfHeaders(title: string, contentLength?: number) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/pdf',
    'Cache-Control': 'private, no-store, no-cache',
    'Content-Disposition': `inline; filename="${encodeURIComponent(title)}.pdf"`,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    // Lets pdf.js/react-pdf switch to ranged requests so it only fetches the
    // xref table + the objects a given page needs, instead of waiting for
    // the entire file to download before rendering anything.
    'Accept-Ranges': 'bytes',
  }
  if (contentLength) headers['Content-Length'] = String(contentLength)
  return headers
}

async function getSupabaseBucket(): Promise<string> {
  const settingsKey = CACHE_KEYS.settings()
  let settingsMap = await cache.get<Record<string, string>>(settingsKey)
  if (!settingsMap) {
    const dbSettings = await prisma.setting.findMany()
    settingsMap = Object.fromEntries(dbSettings.map(s => [s.key, s.value]))
    await cache.set(settingsKey, settingsMap, 3600)
  }
  return settingsMap.supabase_bucket || 'documents'
}

// Telegram's CDN can return a 200 OK with a small HTML/JSON error body for an
// expired file URL instead of a proper 4xx — trusting `res.ok` alone let a
// stale cached URL silently serve a few-KB error page as if it were the real
// (often much larger) PDF. Cross-check content-type and, when we know the
// real file size from the DB, the size too.
function isValidFileResponse(res: Response, expectedSize?: number | null, isRange?: boolean): boolean {
  if (!res.ok) return false
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (contentType.includes('text/html') || contentType.includes('application/json')) return false
  // A ranged request's content-length is the slice size, not the full file
  // size, so the size cross-check only applies to whole-file requests.
  if (!isRange && expectedSize && expectedSize > 0) {
    const len = Number(res.headers.get('content-length') || 0)
    if (len > 0 && Math.abs(len - expectedSize) > Math.max(2048, expectedSize * 0.01)) return false
  }
  return true
}

async function fetchUpstream(telegramFileId: string, telegramMsgId: string, expectedSize?: number | null, rangeHeader?: string | null): Promise<Response> {
  const fetchInit = rangeHeader ? { headers: { Range: rangeHeader } } : undefined

  if (telegramMsgId === 'supabase') {
    const bucket = await getSupabaseBucket()
    const signedUrl = await supabaseCreateSignedUrl(telegramFileId, bucket, 60)
    const res = await fetch(signedUrl, fetchInit)
    if (!isValidFileResponse(res, expectedSize, !!rangeHeader)) {
      throw new Error(`Supabase file fetch returned unexpected content (status ${res.status}, type ${res.headers.get('content-type')})`)
    }
    return res
  }

  const urlCacheKey = CACHE_KEYS.telegramUrl(telegramFileId)
  const cachedUrl = await cache.get<string>(urlCacheKey)
  if (cachedUrl) {
    const res = await fetch(cachedUrl, fetchInit)
    if (isValidFileResponse(res, expectedSize, !!rangeHeader)) return res
    // Cached URL expired/invalid — fall through to refresh below
  }
  const freshUrl = await telegramGetFileUrl(telegramFileId)
  await cache.set(urlCacheKey, freshUrl, 3300)
  const freshRes = await fetch(freshUrl, fetchInit)
  if (!isValidFileResponse(freshRes, expectedSize, !!rangeHeader)) {
    throw new Error(`Telegram file fetch returned unexpected content (status ${freshRes.status}, type ${freshRes.headers.get('content-type')})`)
  }
  return freshRes
}

export interface StreamablePdf {
  telegramFileId: string
  telegramMsgId: string
  title: string
  fileSize?: number | null
}

/**
 * Serves a PDF for streaming to react-pdf/pdf.js: always a direct
 * streaming pass-through from the upstream (Telegram/Supabase) response —
 * never buffered server-side first.
 *
 * This used to fully buffer small files and cache the bytes (base64) in
 * Redis so repeat opens could skip Telegram/Supabase entirely. Measured
 * live against this project's actual Upstash instance, that cache was the
 * opposite of a speedup: Upstash's REST API round-trips the *entire* value
 * over HTTPS as a JSON request/response body, so a ~1.6MB PDF (~2.2MB once
 * base64-encoded) took 14-22s just for the SET on a cache miss, and 1.7-2.8s
 * for the GET on every subsequent request — "hit" included — because the
 * whole blob still has to cross the REST round trip before a single byte
 * reaches the client. A direct Telegram fetch reached first-byte in 0.6-2.7s
 * in the same testing, and streams progressively from there. Upstash REST is
 * a good fit for small JSON values (see the other CACHE_KEYS below) and a
 * poor one for multi-megabyte blobs — the short-lived telegramUrl cache a
 * few lines up is the right-sized use of it here, not this.
 */
export async function buildPdfResponse(doc: StreamablePdf, rangeHeader?: string | null): Promise<NextResponse> {
  const t0 = devTiming ? performance.now() : 0
  const mark = (label: string) => {
    if (devTiming) console.log(`[pdf-stream] ${label} +${(performance.now() - t0).toFixed(0)}ms`)
  }

  const upstreamRes = await fetchUpstream(doc.telegramFileId, doc.telegramMsgId, doc.fileSize, rangeHeader)
  if (!upstreamRes.body) {
    throw new Error('Upstream document fetch returned no body')
  }
  mark('upstream headers received')

  const contentLength = Number(upstreamRes.headers.get('content-length') || 0)

  // A ranged request that the upstream actually honored (206) — pass the
  // slice straight through.
  if (rangeHeader && upstreamRes.status === 206) {
    mark('upstream honored range, passing slice through')
    const headers = pdfHeaders(doc.title)
    const contentRange = upstreamRes.headers.get('content-range')
    if (contentRange) headers['Content-Range'] = contentRange
    if (contentLength) headers['Content-Length'] = String(contentLength)
    return new NextResponse(upstreamRes.body, { status: 206, headers })
  }

  mark('streaming pass-through')
  return new NextResponse(upstreamRes.body, {
    headers: pdfHeaders(doc.title, contentLength || undefined),
  })
}
