import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/layout/providers'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { JsonLd, SITE_URL, SITE_NAME } from '@/components/seo/json-ld'
import { DocumentLoadingOverlay } from '@/components/pdf/document-loading-overlay'
import { ReportBugDialog } from '@/components/bugs/report-bug-dialog'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

const description = 'Access free & premium notes, PYQs, study materials, a GPA calculator, and a student marketplace for KIIT students.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'KIIT Hub — Notes & Study Materials', template: '%s | KIIT Hub' },
  description,
  keywords: ['KIIT', 'KIIT Hub', 'notes', 'PYQ', 'previous year questions', 'study materials', 'SGPA calculator', 'CGPA calculator', 'KIIT merchandise'],
  robots: { index: true, follow: true },
  openGraph: {
    siteName: SITE_NAME,
    title: 'KIIT Hub — Notes & Study Materials',
    description,
    url: '/',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KIIT Hub — Notes & Study Materials',
    description,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.ico`,
  description,
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/notes?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.className} antialiased min-h-screen flex flex-col bg-background`}>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
        <Providers>
          <Navbar />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
          <DocumentLoadingOverlay />
          <ReportBugDialog />
        </Providers>
      </body>
    </html>
  )
}
