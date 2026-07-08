/**
 * Renders a Schema.org JSON-LD block. `data` must be static/trusted content
 * (site config, DB-sourced titles/dates) — never interpolate raw user input
 * here without sanitizing, since this bypasses React's text escaping.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
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
