#!/usr/bin/env node
/**
 * Fetches a sitemap.xml (production by default, or a URL/file passed as the
 * first argument) and validates it with a real XML parser before it's
 * trusted to deploy — not a regex approximation.
 *
 * Usage:
 *   node scripts/validate-sitemap.mjs                              # production
 *   node scripts/validate-sitemap.mjs http://localhost:3000/sitemap.xml
 *   node scripts/validate-sitemap.mjs ./path/to/sitemap.xml         # local file
 */
import { readFile } from 'fs/promises'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

const SITE_URL = 'https://www.kiithub.in.net'
const target = process.argv[2] || `${SITE_URL}/sitemap.xml`
const isUrl = /^https?:\/\//i.test(target)

const errors = []
let body

console.log(`Validating: ${target}\n`)

if (isUrl) {
  const res = await fetch(target)
  body = await res.text()

  if (res.status !== 200) errors.push(`Expected HTTP 200, got ${res.status}`)

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/xml')) {
    errors.push(`Expected Content-Type application/xml, got "${contentType}"`)
  }
} else {
  body = await readFile(target, 'utf8')
}

if (!body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
  errors.push('Response does not begin with the exact expected XML declaration')
}
if (!body.trim().endsWith('</urlset>')) {
  errors.push('Response does not end with </urlset>')
}

const wellFormed = XMLValidator.validate(body, { allowBooleanAttributes: true })
if (wellFormed !== true) {
  errors.push(`XML is not well-formed: ${JSON.stringify(wellFormed.err)}`)
} else {
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(body)
  const urlset = parsed.urlset

  if (!urlset) {
    errors.push('Missing root <urlset> element')
  } else {
    const urls = Array.isArray(urlset.url) ? urlset.url : urlset.url ? [urlset.url] : []
    if (urls.length === 0) errors.push('No <url> entries found')

    const seen = new Set()
    urls.forEach((u, i) => {
      const prefix = `Entry ${i} (${u.loc ?? 'MISSING LOC'})`
      if (!u.loc || typeof u.loc !== 'string') {
        errors.push(`${prefix}: missing or malformed <loc>`)
      } else {
        if (!u.loc.startsWith(SITE_URL)) errors.push(`${prefix}: not a canonical ${SITE_URL} URL`)
        if (seen.has(u.loc)) errors.push(`${prefix}: duplicate URL`)
        seen.add(u.loc)
      }
      if (!u.lastmod || Number.isNaN(Date.parse(u.lastmod))) errors.push(`${prefix}: missing or invalid ISO 8601 <lastmod>`)
      if (!u.changefreq) errors.push(`${prefix}: missing <changefreq>`)
      if (u.priority === undefined || u.priority === null || u.priority === '') errors.push(`${prefix}: missing <priority>`)
    })

    console.log(`Parsed ${urls.length} <url> entries, ${seen.size} unique.`)
  }
}

if (errors.length > 0) {
  console.error(`\n✗ FAILED — ${errors.length} issue(s):`)
  for (const e of errors) console.error(' -', e)
  process.exit(1)
}

console.log('\n✓ Sitemap is well-formed and valid.')
