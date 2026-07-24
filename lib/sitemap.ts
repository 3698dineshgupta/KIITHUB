import { prisma } from '@/lib/prisma'

// Hardcoded, not read from NEXT_PUBLIC_APP_URL: a sitemap must only ever list
// the final canonical URL search engines should index, never whatever an
// environment variable happens to be set to. The non-www→www redirect at the
// domain level is correct and untouched; this just avoids ever depending on
// it by emitting the canonical form directly.
export const SITE_URL = 'https://www.kiithub.in.net'

export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export interface SitemapEntry {
  loc: string
  lastmod: string
  changefreq: ChangeFreq
  priority: string
}

interface RawEntry {
  path: string
  lastmod: Date | string | null | undefined
  changefreq: ChangeFreq
  priority: string
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** A canonical SITE_URL-rooted URL, or null if the path is missing/blank. */
function toCanonicalUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null
  const trimmed = path.trim()
  if (!trimmed) return null
  return trimmed === '/' ? SITE_URL : `${SITE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
}

/** A valid ISO 8601 timestamp, or null if the input can't produce one. */
function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

const STATIC_ROUTES: Omit<RawEntry, 'lastmod'>[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/notes', changefreq: 'daily', priority: '0.9' },
  { path: '/pyq', changefreq: 'daily', priority: '0.9' },
  { path: '/premium', changefreq: 'weekly', priority: '0.8' },
  { path: '/calculator', changefreq: 'monthly', priority: '0.7' },
  { path: '/merchandise', changefreq: 'daily', priority: '0.8' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
]

/**
 * Builds the full list of sitemap entries: static routes plus every
 * published note/PYQ and approved Marketplace listing. Defensive by design
 * — a DB outage degrades to static-routes-only rather than a 500, and every
 * entry is validated (canonical URL, parseable date) before being included.
 */
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const now = new Date()
  const raw: RawEntry[] = STATIC_ROUTES.map(r => ({ ...r, lastmod: now }))

  try {
    const [notes, pyqs, listings] = await Promise.all([
      prisma.note.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
      prisma.pYQ.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
      prisma.merchListing.findMany({ where: { status: 'APPROVED' }, select: { slug: true, updatedAt: true } }),
    ])
    raw.push(
      ...notes.map((n): RawEntry => ({ path: `/notes/${n.slug}`, lastmod: n.updatedAt, changefreq: 'weekly', priority: '0.8' })),
      ...pyqs.map((p): RawEntry => ({ path: `/pyq/${p.slug}`, lastmod: p.updatedAt, changefreq: 'weekly', priority: '0.8' })),
      ...listings.map((l): RawEntry => ({ path: `/merchandise/${l.slug}`, lastmod: l.updatedAt, changefreq: 'weekly', priority: '0.6' })),
    )
  } catch (err) {
    // Sitemap must still return 200 with the static routes even if the DB
    // is unreachable — a 500 here is worse for SEO than a smaller sitemap.
    console.error('getSitemapEntries: DB fetch failed, falling back to static routes only:', err)
  }

  const seen = new Set<string>()
  const entries: SitemapEntry[] = []
  for (const r of raw) {
    const loc = toCanonicalUrl(r.path)
    const lastmod = toIsoDate(r.lastmod)
    if (!loc || !lastmod) continue // no undefined/null/malformed entries
    if (loc !== SITE_URL && !loc.startsWith(`${SITE_URL}/`)) continue // canonical origin only
    if (seen.has(loc)) continue // no duplicates
    seen.add(loc)
    entries.push({ loc, lastmod, changefreq: r.changefreq, priority: r.priority })
  }
  return entries
}

/** Serializes entries to sitemap XML — hand-built, not framework-serialized, so every byte is accounted for. */
export function buildSitemapXml(entries: SitemapEntry[]): string {
  const body = entries
    .map(e => [
      '  <url>',
      `    <loc>${escapeXml(e.loc)}</loc>`,
      `    <lastmod>${e.lastmod}</lastmod>`,
      `    <changefreq>${e.changefreq}</changefreq>`,
      `    <priority>${e.priority}</priority>`,
      '  </url>',
    ].join('\n'))
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}
