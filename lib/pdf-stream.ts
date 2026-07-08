import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cache, CACHE_KEYS } from '@/lib/redis'
import { telegramGetFileUrl } from '@/lib/telegram'
import { supabaseCreateSignedUrl } from '@/lib/supabase'

// Documents under this size get fully buffered and cached in Redis (base64)
// so repeat opens skip Telegram/Supabase entirely. Kept well under Upstash's
// per-value size limits even after base64's ~33% inflation. Larger files are
// streamed straight through instead of buffered — not cached, but avoids
// paying for a full server-side download before the client sees any bytes.
const MAX_CACHE_BYTES = 700 * 1024

const devTiming = process.env.NODE_ENV !== 'production'

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

function parseRange(rangeHeader: string, totalLength: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
  if (!match || (!match[1] && !match[2])) return null
  const start = match[1] ? parseInt(match[1], 10) : totalLength - parseInt(match[2], 10)
  const end = match[2] && match[1] ? Math.min(parseInt(match[2], 10), totalLength - 1) : totalLength - 1
  if (start < 0 || end < start) return null
  return { start, end }
}

function sliceResponse(buf: Buffer, title: string, rangeHeader?: string | null): NextResponse {
  if (rangeHeader) {
    const range = parseRange(rangeHeader, buf.length)
    if (range) {
      const slice = buf.subarray(range.start, range.end + 1)
      const headers = pdfHeaders(title, slice.length)
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${buf.length}`
      return new NextResponse(new Uint8Array(slice), { status: 206, headers })
    }
  }
  return new NextResponse(new Uint8Array(buf), { headers: pdfHeaders(title, buf.length) })
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
 * Serves a PDF for streaming to react-pdf/pdf.js: Redis byte-cache hit
 * returns instantly, a cache miss on a small file buffers once and caches
 * it, and anything else streams straight through from the upstream
 * (Telegram/Supabase) response instead of buffering the whole file
 * server-side before the client sees a single byte.
 */
export async function buildPdfResponse(doc: StreamablePdf, rangeHeader?: string | null): Promise<NextResponse> {
  const t0 = devTiming ? performance.now() : 0
  const mark = (label: string) => {
    if (devTiming) console.log(`[pdf-stream] ${label} +${(performance.now() - t0).toFixed(0)}ms`)
  }

  const byteCacheKey = CACHE_KEYS.pdfBytes(doc.telegramFileId)
  const cached = await cache.get<string>(byteCacheKey)
  if (cached) {
    mark('cache HIT, serving buffered bytes')
    return sliceResponse(Buffer.from(cached, 'base64'), doc.title, rangeHeader)
  }
  mark('cache miss, fetching upstream')

  const upstreamRes = await fetchUpstream(doc.telegramFileId, doc.telegramMsgId, doc.fileSize, rangeHeader)
  if (!upstreamRes.body) {
    throw new Error('Upstream document fetch returned no body')
  }
  mark('upstream headers received')

  const contentLength = Number(upstreamRes.headers.get('content-length') || 0)

  // A ranged request that the upstream actually honored (206) — pass the
  // slice straight through without buffering the whole file server-side.
  if (rangeHeader && upstreamRes.status === 206) {
    mark('upstream honored range, passing slice through')
    const headers = pdfHeaders(doc.title)
    const contentRange = upstreamRes.headers.get('content-range')
    if (contentRange) headers['Content-Range'] = contentRange
    if (contentLength) headers['Content-Length'] = String(contentLength)
    return new NextResponse(upstreamRes.body, { status: 206, headers })
  }

  // Only buffer+cache whole-file responses under the size cap — a range
  // request the upstream didn't honor (fell back to 200) shouldn't get
  // cached mid-slice as if it were the full, unranged file.
  if (!rangeHeader && contentLength > 0 && contentLength < MAX_CACHE_BYTES) {
    const buf = Buffer.from(await upstreamRes.arrayBuffer())
    mark('buffered small file')
    cache.set(byteCacheKey, buf.toString('base64'), 21600).catch(() => {}) // 6h, best-effort
    return new NextResponse(new Uint8Array(buf), { headers: pdfHeaders(doc.title, buf.length) })
  }

  mark('streaming pass-through (large or unknown size)')
  return new NextResponse(upstreamRes.body, {
    headers: pdfHeaders(doc.title, contentLength || undefined),
  })
}
