import { NextResponse } from 'next/server'
import { getSitemapSections, buildSitemapIndexXml } from '@/lib/sitemap'

// Sitemap index listing one child sitemap per section (see /sitemaps/[file]).
// Lives at a different URL from /sitemap.xml on purpose: Search Console
// treats it as a new sitemap with a fresh fetch history. /sitemap.xml stays
// as-is for anything already pointing at it.
export const revalidate = 3600

export async function GET() {
  const xml = buildSitemapIndexXml(await getSitemapSections())

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
