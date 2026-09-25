import { NextResponse } from 'next/server'
import { getSitemapSections, buildSitemapXml, SITEMAP_SECTIONS, type SitemapSection } from '@/lib/sitemap'

// One child sitemap per section, e.g. /sitemaps/notes.xml — listed by
// /sitemap-index.xml. Only the known section files exist; anything else 404s.
export const revalidate = 3600
export const dynamicParams = false

export function generateStaticParams() {
  return SITEMAP_SECTIONS.map(section => ({ file: `${section}.xml` }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const section = file.replace(/\.xml$/, '') as SitemapSection
  if (!SITEMAP_SECTIONS.includes(section)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const xml = buildSitemapXml((await getSitemapSections())[section])

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
