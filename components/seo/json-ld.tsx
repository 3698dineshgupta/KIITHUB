/**
 * Renders a Schema.org JSON-LD block. Some callers embed DB-sourced content
 * that isn't admin-only (e.g. student-submitted Merchandise titles/
 * descriptions) — dangerouslySetInnerHTML bypasses React's text escaping,
 * and JSON.stringify does NOT escape "<", so a value containing a literal
 * "</script>" would close this tag and let arbitrary markup/script execute
 * for every visitor of the page. Escaping "<" to its unicode form is valid
 * inside a JSON string and neutralizes that without changing the parsed data.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.kiithub.in.net').replace(/\/+$/, '')
export const SITE_NAME = 'KIIT Hub'

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
