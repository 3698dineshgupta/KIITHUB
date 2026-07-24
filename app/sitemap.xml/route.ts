import { NextResponse } from 'next/server'
import { getSitemapEntries, buildSitemapXml } from '@/lib/sitemap'

// A literal `sitemap.xml` route folder (not the `sitemap.ts` metadata file
// convention) — that convention hands serialization to Next.js entirely,
// giving no control over the exact bytes returned. This builds and returns
// the XML directly instead, so headers/status/body are all explicit.
//
// Regenerated at most once an hour: content is DB-backed but doesn't need to
// be real-time, and this keeps crawler traffic from hitting the database on
// every single request.
export const revalidate = 3600

export async function GET() {
  const entries = await getSitemapEntries()
  const xml = buildSitemapXml(entries)

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
