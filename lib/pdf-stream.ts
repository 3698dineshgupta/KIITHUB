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

async function fetchUpstream(telegramFileId: string, telegramMsgId: string): Promise<Response> {
  if (telegramMsgId === 'supabase') {
    const bucket = await getSupabaseBucket()
    const signedUrl = await supabaseCreateSignedUrl(telegramFileId, bucket, 60)
    return fetch(signedUrl)
  }

  const urlCacheKey = CACHE_KEYS.telegramUrl(telegramFileId)
  let fileUrl = await cache.get<string>(urlCacheKey)
  if (fileUrl) {
    const res = await fetch(fileUrl)
    if (res.ok) return res
    // Cached URL expired — fall through to refresh below
  }
  fileUrl = await telegramGetFileUrl(telegramFileId)
  await cache.set(urlCacheKey, fileUrl, 3300)
  return fetch(fileUrl)
}

export interface StreamablePdf {
  telegramFileId: string
  telegramMsgId: string
  title: string
}

/**
 * Serves a PDF for streaming to react-pdf/pdf.js: Redis byte-cache hit
 * returns instantly, a cache miss on a small file buffers once and caches
 * it, and anything else streams straight through from the upstream
 * (Telegram/Supabase) response instead of buffering the whole file
 * server-side before the client sees a single byte.
 */
export async function buildPdfResponse(doc: StreamablePdf): Promise<NextResponse> {
  const t0 = devTiming ? performance.now() : 0
  const mark = (label: string) => {
    if (devTiming) console.log(`[pdf-stream] ${label} +${(performance.now() - t0).toFixed(0)}ms`)
  }

  const byteCacheKey = CACHE_KEYS.pdfBytes(doc.telegramFileId)
  const cached = await cache.get<string>(byteCacheKey)
  if (cached) {
    mark('cache HIT, serving buffered bytes')
    return new NextResponse(new Uint8Array(Buffer.from(cached, 'base64')), {
      headers: pdfHeaders(doc.title),
    })
  }
  mark('cache miss, fetching upstream')

  const upstreamRes = await fetchUpstream(doc.telegramFileId, doc.telegramMsgId)
  if (!upstreamRes.ok || !upstreamRes.body) {
    throw new Error(`Upstream document fetch failed (${upstreamRes.status})`)
  }
  mark('upstream headers received')

  const contentLength = Number(upstreamRes.headers.get('content-length') || 0)

  if (contentLength > 0 && contentLength < MAX_CACHE_BYTES) {
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
